import { NextFunction, Request, Response, Router } from 'express';

import {
  CoreController,
  ApiResponse,
  Code,
  CookieUtil,
  JwtPayload,
  JwtUtil,
  User,
  UserRepository,
  authenticationMiddleware,
  catchAsync,
} from '@whooatour/common';

import { InvalidCredentialsError } from '../error/invalid-credentials.error';

export class AuthController implements CoreController {
  public readonly path = '/api/v1/auth';
  public readonly router = Router();
  public readonly repository = new UserRepository(User);

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes = (): void => {
    this.router.route(`${this.path}/sign-in`).post(this.signIn);
    this.router
      .route(`${this.path}/sign-out`)
      .post(authenticationMiddleware, this.signOut);

    // this.router.all('*', this.handleRoutes);
  };

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

  private signIn = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const { email, password } = request.body;

      if (!email || !password) {
        return next(
          new InvalidCredentialsError(
            Code.BAD_REQUEST,
            '이메일과 비밀번호를 입력하세요.',
            true,
          ),
        );
      }

      const user = await this.repository.find({ email });

      if (!user || !(await user.matchPassword(password, user.password))) {
        return next(
          new InvalidCredentialsError(
            Code.BAD_REQUEST,
            '이메일 혹은 비밀번호가 정확하지 않습니다.',
            true,
          ),
        );
      }

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

  private signOut = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const cookieAccess = CookieUtil.clear('AccessToken', '/');
      const cookieRefresh = CookieUtil.clear('RefreshToken', '/');

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        null,
        '로그아웃 했습니다.',
      );

      response
        .status(Code.OK.code)
        .setHeader('Set-Cookie', [cookieAccess, cookieRefresh])
        .json(success);
    },
  );
}
