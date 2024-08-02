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
  User,
  UserRepository,
  UserRole,
  authenticationMiddleware,
  authorizationMiddleware,
  catchAsync,
  validationMiddleware,
  multerInstance,
  sanitizeField,
  JwtType,
  mapRoleToEnum,
} from '@whooatour/common';
import { JwtBundle } from '@whooatour/common/dist/type/jwt-bundle.type';

import { InvalidApiError } from '../error/invalid-api.error';
import { InvalidCredentialsError } from '../error/invalid-credentials.error';
import { SamePasswordError } from '../error/same-password.error';
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

  // TODO: 인증 미들웨어 간소화.
  public initializeRoutes = (): void => {
    this.router.route(`${this.path}`).get(authenticationMiddleware, this.getMe);

    this.router
      .route(`${this.path}/forget-password`)
      .post(authenticationMiddleware, this.forgetMyPassword);

    this.router
      .route(`${this.path}/reset-password/:token`)
      .patch(authenticationMiddleware, this.resetMyPassword);

    this.router
      .route(`${this.path}/update-password`)
      .patch(authenticationMiddleware, this.updateMyPassword);

    this.router
      .route(this.path)
      .delete(authenticationMiddleware, this.deleteMe)
      .patch(
        authenticationMiddleware,
        ...validationMiddleware(UserValidator.update()),
        this.uploadPhoto,
        // this.resizePhoto,
        this.updateMe,
      )
      .post(...validationMiddleware(UserValidator.create()), this.createMe);

    this.router.route(`${this.path}/current-user/:id`).get(this.getCurrentUser);

    /* 관리자 경로 */
    this.router
      .route(`${this.adminPath}/:id`)
      .delete(
        authenticationMiddleware,
        authorizationMiddleware(UserRole.Admin),
        this.deleteUser,
      )
      .get(
        authenticationMiddleware,
        authorizationMiddleware(UserRole.Admin),
        this.getUser,
      )
      .patch(
        authenticationMiddleware,
        authorizationMiddleware(UserRole.Admin),
        ...validationMiddleware(UserValidator.update()),
        this.uploadPhoto,
        // this.resizePhoto,
        this.updateUser,
      );

    this.router
      .route(this.adminPath)
      .get(
        authenticationMiddleware,
        authorizationMiddleware(UserRole.Admin),
        this.getUsers,
      );

    // this.router.all('*', this.handleRoutes);
  };

  // TODO: 추상 컨트롤러에서 구현.
  // private handleRoutes = async (
  //   request: Request,
  //   response: Response,
  //   next: NextFunction,
  // ) => {
  //   const error = {
  //     codeAttr: Code.NOT_FOUND,
  //     detail: `페이지 ${request.originalUrl}는 존재하지 않습니다.`,
  //     isOperational: true,
  //   };

  //   next(error);
  // };

  private createMe = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      /* MongoDB 오류로 이메일 중복 검사. */
      const { email, name, password, photo, userRole } = request.body;

      const user = await this.repository.create({
        name,
        email,
        password,
        photo,
        userRole: mapRoleToEnum(userRole),
        ...request.body, // TODO: 코드 개선
      });

      const success = ApiResponse.handleSuccess(
        Code.CREATED.code,
        Code.CREATED.message,
        user,
        '회원가입 했습니다.',
      );

      response.status(Code.CREATED.code).json(success);
    },
  );

  private deleteMe = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      await this.repository.update(
        { _id: request.user?.id },
        { active: false, deletedAt: Date.now() },
      );

      const success = ApiResponse.handleSuccess(
        Code.NO_CONTENT.code,
        Code.NO_CONTENT.message,
        null,
        '회원탈퇴 했습니다.',
      );

      // TODO: 204일 경우 데이터 전송이 안된다.
      response.status(Code.OK.code).json(success);
    },
  );

  private forgetMyPassword = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      /* 1. 이메일을 기준으로 사용자를 조회한다. */
      const user = await this.repository.find({ email: request.body.email });

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
        user.passwordResetToken = user.passwordResetTokenExpiration = undefined;

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
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const user = await this.repository.find({ _id: request.params.id });

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
      const user = await this.repository.find({ _id: request.user?.id });

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

      const user = await this.repository.find({
        passwordResetToken,
        passwordResetTokenExpiration: { $gt: Date.now() },
      });

      // if (!user) {
      //   return next(
      //     new UserNotFoundError(
      //       Code.NOT_FOUND,
      //       '비밀번호 재설정 토큰이 만료되었거나 유효하지 않습니다.',
      //     ),
      //   );
      // }

      /* 2. 비밀번호 재변경 토큰이 만료되지 않았고 사용자가 존재한다면 비밀번호를 재설정한다. */
      user.password = request.body.password;
      user.passwordResetToken = user.passwordResetTokenExpiration = undefined;

      /*
       * 수정 시 여행(findOneAnddUpdate() 메서드)과 달리 save() 메서드를 사용한다.
       * 유효성 검사와 비밀번호 암호화(e.g., 미들웨어)와 같은 작업을 실행해야 하기 때문이다.
       */
      await user.save();

      /* 3. 비밀번호 변경 타임스탬프 필드를 수정한다. */
      const payload: JwtPayload = { id: user._id };
      const jwt: JwtBundle = JwtUtil.issue(payload);
      const cookies = [
        CookieUtil.set(
          JwtType.AccessToken,
          jwt.accessToken,
          true,
          process.env.COOKIE_ACCESS_EXPIRATION * 60 * 60,
          'Strict',
          '/',
          process.env.NODE_ENV === 'production' ? true : false,
        ),
        CookieUtil.set(
          JwtType.RefreshToken,
          jwt.refreshToken,
          true,
          process.env.COOKIE_REFRESH_EXPIRATION * 60 * 60 * 24,
          'Strict',
          '/',
          process.env.NODE_ENV === 'production' ? true : false,
        ),
      ];

      /* 4. 사용자를 로그인하고 쿠키를 전송한다. */
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
      // TODO: 더 간단한 방법?
      const user = await this.repository.update(
        { _id: request.user?.id },
        { ...field, updatedAt: Date.now() },
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
      /* 1. 아이디를 기준으로 사용자를 조회한다(로그인한 상태.). */
      const user = await this.repository.find({ _id: request.user?.id });
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
      user.password = newPassword;
      await user.save();

      /* 5. 사용자를 로그인하고 쿠키를 전송한다. */
      const payload: JwtPayload = { id: user._id };
      const jwt: JwtBundle = JwtUtil.issue(payload);
      const cookies = [
        CookieUtil.set(
          JwtType.AccessToken,
          jwt.accessToken,
          true,
          process.env.COOKIE_ACCESS_EXPIRATION * 60 * 60,
          'Strict',
          '/',
          process.env.NODE_ENV === 'production' ? true : false,
        ),
        CookieUtil.set(
          JwtType.RefreshToken,
          jwt.refreshToken,
          true,
          process.env.COOKIE_REFRESH_EXPIRATION * 60 * 60 * 24,
          'Strict',
          '/',
          process.env.NODE_ENV === 'production' ? true : false,
        ),
      ];

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

  private uploadPhoto = multerInstance.multer.single('photo');

  /* 관리자 API */
  private deleteUser = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      await this.repository.update(
        { _id: request.params.id },
        { active: false, deletedAt: Date.now() },
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
      const user = await this.repository.find({ _id: request.params.id });

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
        this.repository.findAll(),
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

  private updateUser = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const { name, email, password, userRole } = request.body;
      const photo = request.file !== null ? request.file?.filename : null;
      const user = await this.repository.find({ _id: request.params.id });

      user.set({
        email: !email ? user.email : email,
        name: !name ? user.name : name,
        photo: !photo ? user.photo : photo,
        userRole: !userRole ? user.userRole : mapRoleToEnum(userRole),
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
}
