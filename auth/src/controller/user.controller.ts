import * as crypto from 'crypto';

import { NextFunction, Request, Response, Router } from 'express';

import {
  CoreController,
  ApiResponse,
  Code,
  CookieUtil,
  EmailMessage,
  EmailSendError,
  EmailUtil,
  JwtPayload,
  JwtUtil,
  QueryBuilder,
  QueryRequest,
  RequestWithUser,
  User,
  UserNotFoundError,
  UserRepository,
  UserRole,
  authenticationMiddleware,
  authorizationMiddleware,
  catchAsync,
  fieldFilter,
  validationMiddleware,
  multerInstance,
} from '@whooatour/common';

import { InvalidApiError } from '../error/invalid-api.error';
import { InvalidCredentialsError } from '../error/invalid-credentials.error';
import { SamePasswordError } from '../error/same-password.error';
import { UserValidator } from '../util/user-validator';

multerInstance.initialize(process.env.IMAGE_DIRECTORY_PATH, 'user', 'image');

export class UserController implements CoreController {
  public readonly path = '/api/v1/users';
  public readonly router = Router();
  public readonly repository = new UserRepository(User);

  constructor() {
    this.initializeRoutes();
  }

  // TODO: 인증 미들웨어 간소화.
  public initializeRoutes = (): void => {
    this.router
      .route(`${this.path}/me`)
      .get(authenticationMiddleware, this.getMe);

    this.router
      .route(`${this.path}/:id`)
      .get(
        authenticationMiddleware,
        authorizationMiddleware(UserRole.Admin),
        this.getUser,
      );

    this.router
      .route(`${this.path}/forget-password`)
      .post(authenticationMiddleware, this.forgetPassword);

    this.router
      .route(`${this.path}/reset-password/:token`)
      .patch(authenticationMiddleware, this.resetPassword);

    this.router
      .route(`${this.path}/update-password`)
      .patch(authenticationMiddleware, this.updatePassword);

    // this.router
    //   .route(`${this.path}/create`)
    //   .post(...validationMiddleware(UserValidator.create()), this.createUser);

    this.router
      .route(this.path)
      .delete(authenticationMiddleware, this.deleteUser)
      .get(
        authenticationMiddleware,
        authorizationMiddleware(UserRole.Admin),
        this.getUsers,
      )
      .patch(
        authenticationMiddleware,
        ...validationMiddleware(UserValidator.update()),
        this.uploadPhoto,
        // this.resizePhoto,
        this.updateUser,
      )
      .post(...validationMiddleware(UserValidator.create()), this.createUser);

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

  private createUser = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      /* MongoDB 오류로 이메일 중복 검사. */
      const user = await this.repository.create({
        name: request.body.name,
        email: request.body.email,
        password: request.body.password,
        photo: request.body.photo,
        role: request.body.role,
        ...request.body, // TODO: 코드 개선
      });

      const success = ApiResponse.handleSuccess(
        Code.CREATED.code,
        Code.CREATED.message,
        user,
        '사용자를 생성했습니다.',
      );

      response.status(Code.CREATED.code).json(success);
    },
  );

  private deleteUser = catchAsync(
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
        '사용자를 삭제했습니다.',
      );

      // TODO: 204일 경우 데이터 전송이 안된다.
      response.status(Code.OK.code).json(success);
    },
  );

  // TODO: 이메일 일치 여부 확인, 하지만 운영 환경에서는 이메일 계정으로 전달하는데 굳이?
  private forgetPassword = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      /* 1. 이메일을 기준으로 사용자를 조회한다. */
      const user = await this.repository.find({ email: request.body.email });

      if (!user) {
        return next(
          new UserNotFoundError(
            Code.NOT_FOUND,
            '이메일에 해당하는 사용자가 존재하지 않습니다.',
            true,
          ),
        );
      }

      /* 2. 비밀번호 재설정 토큰을 생성한다. */
      const passwordResetToken = user.createPasswordResetToken();
      /* createPasswordResetToken() 메서드에서 데이터를 수정만 했다.
       * 데이터베이스에 수정하려면 저장해야 한다.
       * validateBeforeSave 옵션은 스키마에 지정한 모든 유효성 검사를 비활성화한다.
       */
      await user.save({ validateBeforeSave: false });

      /* 3. 사용자의 이메일로 비밀번호 재설정 토큰을 전송한다. */
      const url = `${request.protocol}://${request.get('host')}/api/v1/users/reset-password/${passwordResetToken}`;

      const emailMessage: Partial<EmailMessage> = {
        to: user.email,
        subject:
          '비밀번호 재설정 토큰이 발급되었습니다. 토큰은 10분간 유효합니다.',
        text: `비밀번호를 잊으셨나요? 새 비밀번호와 비밀번호 확인을 ${url}에 제출해 주세요. 비밀번호를 잊지 않으셨다면 이 이메일을 무시해 주세요.`,
      };

      /*
       * 이메일 전송 오류 발생 시 비밀번호 재설정 토큰과 만기일을 없애야 한다.
       * 따라서, 전역 오류 처리기로 오류를 전달하지 않고 try-catch 블록을 사용한다.
       */
      try {
        await EmailUtil.send(emailMessage);

        const success = ApiResponse.handleSuccess(
          Code.OK.code,
          Code.OK.message,
          passwordResetToken,
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
            true,
          ),
        );
      }
    },
  );

  private getMe = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const user = await this.repository.find({ _id: request.user?.id });

      if (!user) {
        return next(
          new UserNotFoundError(
            Code.NOT_FOUND,
            '사용자가 존재하지 않습니다.',
            true,
          ),
        );
      }

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '사용자를 찾았습니다.',
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

      if (!user) {
        return next(
          new UserNotFoundError(
            Code.NOT_FOUND,
            '사용자가 존재하지 않습니다.',
            true,
          ),
        );
      }

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '사용자를 찾았습니다.',
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
        '사용자 목록을 찾았습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  //private processPhoto = catchAsync(async(request: RequestWithUser, response: Response, next: NextFunction))

  private resetPassword = catchAsync(
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

      if (!user) {
        return next(
          new UserNotFoundError(
            Code.NOT_FOUND,
            '비밀번호 재설정 토큰이 만료되었거나 유효하지 않습니다.',
            true,
          ),
        );
      }

      /* 2. 비밀번호 재변경 토큰이 만료되지 않았고 사용자가 존재한다면 비밀번호를 재설정한다. */
      user.password = request.body.password;
      user.passwordResetToken = user.passwordResetTokenExpiration = undefined;

      /*
       * 수정 시 여행(findOneAnddUpdate() 메서드)과 달리  save() 메서드를 사용한다.
       * 유효성 검사와 비밀번호 암호화(e.g., 미들웨어)와 같은 작업을 실행해야 하기 때문이다.
       */
      await user.save();

      /* 3. 비밀번호 변경 타임스탬프 필드를 수정한다. */
      const payload: JwtPayload = { id: user._id };

      const jwtAccess = JwtUtil.issue(
        payload,
        process.env.JWT_ACCESS_SECRET,
        process.env.JWT_ACCESS_EXPIRATION,
      );
      const jwtRefresh = JwtUtil.issue(
        payload,
        process.env.JWT_REFRESH_SECRET,
        process.env.JWT_REFRESH_EXPIRATION,
      );

      const cookieAccess = CookieUtil.set(
        'AccessToken',
        jwtAccess,
        true,
        process.env.COOKIE_ACCESS_EXPIRATION * 60 * 60,
        'Strict',
        '/',
        process.env.NODE_ENV === 'production' ? true : false,
      );
      const cookieRefresh = CookieUtil.set(
        'RefreshToken',
        jwtRefresh,
        true,
        process.env.COOKIE_REFRESH_EXPIRATION * 60 * 60 * 24,
        'Strict',
        '/',
        process.env.NODE_ENV === 'production' ? true : false,
      );

      /* 4. 사용자를 로그인하고 쿠키를 전송한다. */
      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '로그인 했습니다.',
      );

      response
        .status(Code.OK.code)
        .setHeader('Set-Cookie', [cookieAccess, cookieRefresh])
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

  private updatePassword = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      /* 1. 아이디를 기준으로 사용자를 조회한다(로그인한 상태.). */
      const user = await this.repository.find({ _id: request.user?.id });

      if (!user) {
        return next(
          new UserNotFoundError(
            Code.NOT_FOUND,
            '아이디에 해당하는 사용자가 존재하지 않습니다.',
            true,
          ),
        );
      }

      const oldPassword = request.body.oldPassword;
      const newPassword = request.body.newPassword;

      /* 2. 비밀번호가 일치하는지 확인한다. */
      if (!(await user.matchPassword(oldPassword, user.password))) {
        return next(
          new InvalidCredentialsError(
            Code.BAD_REQUEST,
            '비밀번호가 정확하지 않습니다.',
            true,
          ),
        );
      }

      /* 3. 새로운 비밀번호가 이전 비밀번호와 같은 경우를 제외한다. */
      if (oldPassword === newPassword) {
        return next(
          new SamePasswordError(
            Code.BAD_REQUEST,
            '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
            true,
          ),
        );
      }

      /* 4. 비밀번호를 수정한다. */
      user.password = newPassword;
      await user.save();

      /* 5. 사용자를 로그인하고 쿠키를 전송한다. */
      const payload: JwtPayload = { id: user._id };

      const jwtAccess = JwtUtil.issue(
        payload,
        process.env.JWT_ACCESS_SECRET,
        process.env.JWT_ACCESS_EXPIRATION,
      );
      const jwtRefresh = JwtUtil.issue(
        payload,
        process.env.JWT_REFRESH_SECRET,
        process.env.JWT_REFRESH_EXPIRATION,
      );

      const cookieAccess = CookieUtil.set(
        'AccessToken',
        jwtAccess,
        true,
        process.env.COOKIE_ACCESS_EXPIRATION * 60 * 60,
        'Strict',
        '/',
        process.env.NODE_ENV === 'production' ? true : false,
      );
      const cookieRefresh = CookieUtil.set(
        'RefreshToken',
        jwtRefresh,
        true,
        process.env.COOKIE_REFRESH_EXPIRATION * 60 * 60 * 24,
        'Strict',
        '/',
        process.env.NODE_ENV === 'production' ? true : false,
      );

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        user,
        '로그인 했습니다.',
      );

      response
        .status(Code.OK.code)
        .setHeader('Set-Cookie', [cookieAccess, cookieRefresh])
        .json(success);
    },
  );

  private updateUser = catchAsync(
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
            true,
          ),
        );
      }

      /* 2. 필요없는 필드를 여과한다. */
      const field = fieldFilter(request.body, 'name', 'email');
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
        '사용자를 수정했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );

  private uploadPhoto = multerInstance.multer.single('photo');
}
