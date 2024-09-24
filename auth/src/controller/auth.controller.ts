import { NextFunction, Request, Response, Router } from 'express';

import {
  CoreController,
  ApiResponse,
  Code,
  CookieUtil,
  JwtPayload,
  JwtUtil,
  authenticationMiddleware,
  catchAsync,
  RequestWithUser,
} from '@whooatour/common';
import { JwtBundle } from '@whooatour/common/dist/type/jwt-bundle.type';

import { InvalidCredentialsError } from '../error/invalid-credentials.error';
import { User } from '../model/user.model';
import { redis } from '../redis/redis';
import { UserRepository } from '../repository/user.repository';

export class AuthController implements CoreController {
  public readonly path = '/api/v1/auth';
  public readonly router = Router();
  public readonly repository = new UserRepository(User);

  constructor() {
    this.initializeRoutes();
  }

  public initializeRoutes = (): void => {
    this.router.post(`${this.path}/sign-in`, this.signIn);
    this.router.post(
      `${this.path}/sign-out`,
      authenticationMiddleware(redis),
      this.signOut,
    );
  };

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
          ),
        );
      }

      /* find() 메서드의 미들웨어에서 active: false를 배제한다. */
      const user = await this.repository.findOne({ email });

      if (!(await user.matchPassword(password, user.password))) {
        return next(
          new InvalidCredentialsError(
            Code.BAD_REQUEST,
            '이메일 혹은 비밀번호가 정확하지 않습니다.',
          ),
        );
      }

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

  private signOut = catchAsync(
    async (
      request: RequestWithUser,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const cookies = CookieUtil.clearJwtCookies();

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        null,
        '로그아웃 했습니다.',
      );

      response
        .status(Code.OK.code)
        .setHeader('Set-Cookie', cookies)
        .json(success);
    },
  );
}
