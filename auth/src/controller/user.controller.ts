import * as crypto from 'crypto';

import { NextFunction, Request, Response, Router } from 'express';

import {
  CoreController,
  ApiResponse,
  Code,
  CookieUtil,
  EmailSendError,
  EmailUtil,
  JwtPayload,
  JwtUtil,
  QueryBuilder,
  QueryRequest,
  RequestWithUser,
  UserRole,
  authenticationMiddleware,
  authorizationMiddleware,
  catchAsync,
  validationMiddleware,
  multerInstance,
  sanitizeField,
  UnauthorizedUserError,
  natsInstance,
  mapStringToUserRole,
} from '@whooatour/common';
import { JwtBundle } from '@whooatour/common/dist/type/jwt-bundle.type';

import { InvalidApiError } from '../error/invalid-api.error';
import { InvalidCredentialsError } from '../error/invalid-credentials.error';
import { SamePasswordError } from '../error/same-password.error';
import { UserBannedPublisher } from '../event/publisher/user-banned.publisher';
import { UserUnbannedPublisher } from '../event/publisher/user-unbanned.publisher';
import { User } from '../model/user.model';
import { redis } from '../redis/redis';
import { UserRepository } from '../repository/user.repository';
import { UserValidator } from '../util/user-validator';

multerInstance.initialize(process.env.IMAGE_DIRECTORY_PATH, 'user', 'image');

export class UserController implements CoreController {
  public readonly path = '/api/v1/users';
  public readonly adminPath = '/api/v1/admin/users';
  public readonly router = Router();
  public readonly repository = new UserRepository(User);

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes = (): void => {
    this.router.get(`${this.path}/current-user/:id`, this.getCurrentUser);

    this.router.post(`${this.path}/forget-password`, this.forgetMyPassword);

    this.router.patch(
      `${this.path}/reset-password/:token`,
      this.resetMyPassword,
    );

    this.router.post(
      this.path,
      ...validationMiddleware(UserValidator.create()),
      this.createMe,
    );

    this.router.patch(
      `${this.path}/update-password`,
      authenticationMiddleware(redis),
      this.updateMyPassword,
    );

    this.router.get(this.path, authenticationMiddleware(redis), this.getMe);

    this.router
      .use(authenticationMiddleware(redis))
      .route(this.path)
      .delete(this.deleteMe)
      .patch(
        ...validationMiddleware(UserValidator.update()),
        this.uploadPhoto,
        // this.resizePhoto,
        this.updateMe,
      );

    /* 관리자 API */
    this.router.patch(
      `${this.adminPath}/:id/banned`,
      authenticationMiddleware(redis),
      authorizationMiddleware(UserRole.Admin),
      this.banUser,
    );
    this.router.patch(
      `${this.adminPath}/:id/unbanned`,
      authenticationMiddleware(redis),
      authorizationMiddleware(UserRole.Admin),
      this.unbanUser,
    );

    this.router
      .use(
        authenticationMiddleware(redis),
        authorizationMiddleware(UserRole.Admin),
      )
      .route(`${this.adminPath}/:id`)
      .delete(this.deleteUser)
      .get(this.getUser)
      .patch(
        ...validationMiddleware(UserValidator.update()),
        this.uploadPhoto,
        // this.resizePhoto,
        this.updateUser,
      );

    this.router.get(
      this.adminPath,
      authenticationMiddleware(redis),
      authorizationMiddleware(UserRole.Admin),
      this.getUsers,
    );
  };

  private createMe = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const { email, name, password, photo, userRole } = request.body;

      const user = await this.repository.create({
        email,
        name,
        password,
        photo,
        userRole: mapStringToUserRole(userRole),
        ...request.body,
      });

      //const url = `${request.protocol}://${request.get('host')}/api/v1/users/me`;

      //await EmailUtil.create(user.email, url).sendWelcome();

      const success = ApiResponse.handleSuccess(
        Code.CREATED.code,
        Code.CREATED.message,
        user,
        '회원가입 했습니다.',
      );

      response.status(Code.CREATED.code).json(success);
    },
  );

  // TODO: 사용자 차단처럼 이벤트
  private deleteMe = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      if (request.user!.banned) {
        return next(
          new UnauthorizedUserError(
            Code.FORBIDDEN,
            '차단되어서 회원탈퇴를 할 수 있는 권한이 없습니다.',
          ),
        );
      }

      await this.repository.update(
        { _id: request.user!.id },
        { active: false, deletedAt: new Date(Date.now()) },
      );

      const cookies = CookieUtil.clearJwtCookies();

      const success = ApiResponse.handleSuccess(
        Code.NO_CONTENT.code,
        Code.NO_CONTENT.message,
        null,
        '회원탈퇴 했습니다.',
      );

      response
        .status(Code.OK.code)
        .setHeader('Set-Cookie', cookies)
        .json(success);
    },
  );

  private forgetMyPassword = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      /* 1. 이메일을 기준으로 사용자를 조회한다. */
      const user = await this.repository.findOne({ email: request.body.email });

      /* 2. 비밀번호 재설정 토큰을 생성한다. */
      const passwordResetToken = user.createPasswordResetToken();
      /*
       * createPasswordResetToken() 메서드에서 데이터를 수정만 했으며 데이터베이스에 수정하려면 저장해야 한다.
       * validateBeforeSave 옵션은 스키마에 지정한 모든 유효성 검사를 비활성화한다.
       */
      await user.save({ validateBeforeSave: false });

      /* 3. 사용자의 이메일로 비밀번호 재설정 토큰을 전송한다. */
      const url = `${request.protocol}://${request.get('host')}/api/v1/users/reset-password/${passwordResetToken}`;

      /*
       * 이메일 전송 오류 발생 시 비밀번호 재설정 토큰과 만기일을 없애야 한다.
       * 따라서, 전역 오류 처리기로 오류를 전달하지 않고 try-catch 블록을 사용한다.
       */
      try {
        await EmailUtil.create(user.email, url).sendPasswordReset();

        const success = ApiResponse.handleSuccess(
          Code.OK.code,
          Code.OK.message,
          { passwordResetToken },
          '비밀번호 재설정 토큰이 전송되었습니다.',
        );

        response.status(Code.OK.code).json(success);
      } catch (error) {
        user.set({
          passwordResetToken: undefined,
          passwordResetTokenExpiration: undefined,
        });
        await user.save({ validateBeforeSave: false });

        return next(
          new EmailSendError(
            Code.INTERNAL_SERVER_ERROR,
            '이메일 전송 중 오류가 발생했습니다.',
            false,
          ),
        );
      }
    },
  );

  private getCurrentUser = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const user = await this.repository.findOne({ _id: request.params.id });

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '현재 사용자를 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getMe = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const user = await this.repository.findOne({ _id: request.user!.id });

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '회원정보를 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private resetMyPassword = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      /* 1. 비밀번호 재변경 토큰을 기준으로 사용자를 조회한다. */
      const passwordResetToken = crypto
        .createHash('sha256')
        .update(request.params.token)
        .digest('hex');

      const user = await this.repository.findOne({
        passwordResetToken,
        passwordResetTokenExpiration: { $gt: Date.now() },
      });

      /* 2. 비밀번호 재변경 토큰이 만료되지 않았고 사용자가 존재한다면 비밀번호와 비밀번호 수정 타임스탬프를 설정한다. */
      user.set({
        password: request.body.password,
        passwordResetToken: undefined,
        passwordResetTokenExpiration: undefined,
      });

      /*
       * 수정 시 findOneAndUpdate() 메서드가 아니라 save() 메서드를 사용한다.
       * 유효성 검사와 비밀번호 암호화(e.g., 미들웨어)와 같은 작업을 실행해야 하기 때문이다.
       */
      await user.save();

      const payload: JwtPayload = { id: user._id };

      const jwt: JwtBundle = JwtUtil.issue(payload, user.email);

      const cookies = CookieUtil.setJwtCookies(
        jwt.accessToken,
        jwt.refreshToken,
      );

      /* 3. 사용자를 로그인하고 쿠키를 전송한다. */
      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '로그인 했습니다.',
      );

      response
        .status(Code.OK.code)
        .setHeader('Set-Cookie', cookies)
        .json(success);
    },
  );

  // ERROR: NodeJS 버전 업그레이드 필요.
  // private resizePhoto = catchAsync(
  //   async (
  //     request: RequestWithUser,
  //     response: Response,
  //     next: NextFunction,
  //   ): Promise<void> => {
  //     if (!request.file) {
  //       return next();
  //     }

  //     const filename = `user-${request.user?.id}-${Date.now()}.jpeg`;

  //     await sharp(request.file.buffer)
  //       .resize(500, 500)
  //       .toFormat('jpeg')
  //       .jpeg({ quality: 90 })
  //       .toFile(`public/image/users/${filename}`);
  //
  //     next();
  //   },
  // );

  private updateMe = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      if (request.user!.banned) {
        return next(
          new UnauthorizedUserError(
            Code.FORBIDDEN,
            '차단되어서 회원수정을 할 수 있는 권한이 없습니다.',
          ),
        );
      }

      /* 1. 비밀번호 수정 시 오류를 전송한다. */
      if (request.body.password) {
        return next(
          new InvalidApiError(
            Code.BAD_REQUEST,
            '비밀번호를 수정하려면 다른 API를 사용하세요.',
          ),
        );
      }

      /* 2. 필요없는 필드를 여과한다. */
      const field = sanitizeField(request.body, 'name', 'email');
      if (request.file) {
        field.photo = request.file.filename;
      }

      /* 3. 사용자를 수정한다. */
      const user = await this.repository.update(
        { _id: request.user!.id },
        { ...field, updatedAt: new Date(Date.now()) },
      );

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '회원수정을 했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private updateMyPassword = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      console.log(request.user);
      console.log(typeof request.user!.banned);

      if (request.user!.banned) {
        return next(
          new UnauthorizedUserError(
            Code.FORBIDDEN,
            '차단되어서 비밀번호를 수정할 수 있는 권한이 없습니다.',
          ),
        );
      }

      /* 1. 아이디를 기준으로 사용자를 조회한다(로그인한 상태.). */
      const user = await this.repository.findOne({ _id: request.user!.id });
      const oldPassword = request.body.oldPassword;
      const newPassword = request.body.newPassword;

      /* 2. 비밀번호가 일치하는지 확인한다. */
      if (!(await user.matchPassword(oldPassword, user.password))) {
        return next(
          new InvalidCredentialsError(
            Code.BAD_REQUEST,
            '비밀번호가 정확하지 않습니다.',
          ),
        );
      }

      /* 3. 새로운 비밀번호가 이전 비밀번호와 같은 경우를 제외한다. */
      if (oldPassword === newPassword) {
        return next(
          new SamePasswordError(
            Code.BAD_REQUEST,
            '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
          ),
        );
      }

      /* 4. 비밀번호를 수정한다. */
      user.set({
        password: newPassword,
      });
      await user.save();

      /* 5. 사용자를 로그인하고 쿠키를 전송한다. */
      const payload: JwtPayload = { id: user._id };

      const jwt: JwtBundle = JwtUtil.issue(payload, user.email);

      const cookies = CookieUtil.setJwtCookies(
        jwt.accessToken,
        jwt.refreshToken,
      );

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '로그인 했습니다.',
      );

      response
        .status(Code.OK.code)
        .setHeader('Set-Cookie', cookies)
        .json(success);
    },
  );

  /* 관리자 API */
  private banUser = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const user = await this.repository.findOne({ _id: request.params.id });

      user.set({
        banned: true,
      });

      await user.save({ validateModifiedOnly: true });

      await new UserBannedPublisher(natsInstance.client).publish({
        id: user.id,
        banned: user.banned,
        userRole: user.userRole,
        sequence: user.sequence,
      });

      /*
       * 인증 서비스는 이벤트 구독이 없기 때문에 Redis에 저장된 상태일 경우 수정이 안된다.
       * 따라서 차단 시 쿠키를 삭제해서 강제로 로그아웃 시킨다.
       */
      const cookies = CookieUtil.clearJwtCookies();

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '사용자를 차단했습니다.',
      );

      response
        .status(Code.OK.code)
        .setHeader('Set-Cookie', cookies)
        .json(success);
    },
  );

  private deleteUser = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      await this.repository.update(
        { _id: request.params.id },
        { active: false, deletedAt: new Date(Date.now()) },
      );

      const success = ApiResponse.handleSuccess(
        Code.NO_CONTENT.code,
        Code.NO_CONTENT.message,
        null,
        '사용자를 삭제했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getUser = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const user = await this.repository.findOne({ _id: request.params.id });

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '사용자를 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private getUsers = catchAsync(
    async (
      request: QueryRequest,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const queryBuilder = new QueryBuilder(
        this.repository.find(),
        request.query,
      )
        .filter()
        .sort()
        .project()
        .paginate();

      const users = await queryBuilder.query;

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        users,
        '사용자 목록을 조회했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private unbanUser = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const user = await this.repository.findOne({ _id: request.params.id });

      user.set({
        banned: false,
      });

      await user.save({ validateModifiedOnly: true });

      await new UserUnbannedPublisher(natsInstance.client).publish({
        id: user.id,
        banned: user.banned,
        userRole: user.userRole,
        sequence: user.sequence,
      });

      /*
       * 인증 서비스는 이벤트 구독이 없기 때문에 Redis에 저장된 상태일 경우 수정이 안된다.
       * 따라서 차단 해제 시 쿠키를 삭제해서 강제로 로그아웃 시킨다.
       */
      const cookies = CookieUtil.clearJwtCookies();

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '사용자 차단을 해제했습니다.',
      );

      response
        .status(Code.OK.code)
        .setHeader('Set-Cookie', cookies)
        .json(success);
    },
  );

  private updateUser = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const { name, email, password, userRole } = request.body;
      const photo = request.file ? request.file.filename : null;
      const user = await this.repository.findOne({ _id: request.params.id });

      user.set({
        email: !email ? user.email : email,
        name: !name ? user.name : name,
        photo: !photo ? user.photo : photo,
        userRole: !userRole ? user.userRole : mapStringToUserRole(userRole),
      });

      /* 비밀번호는 평문이 아니라 암호문이라서 입력에 존재하는 경우만 고려한다. */
      if (password) {
        user.password = password;
      }

      /* 입력에 없는 필드로 발생하는 오류를 방지한다. */
      await user.save({
        validateModifiedOnly: true,
      });

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '사용자를 수정했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private uploadPhoto = multerInstance.multer.single('photo');
}
