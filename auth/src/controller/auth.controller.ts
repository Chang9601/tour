import { NextFunction, Request, Response, Router } from 'express';
import * as jwt from 'jsonwebtoken';

import {
  AbstractController,
  ApiResponse,
  Code,
  catchAsync,
  validationMiddleware,
} from '@whooatour/common';

import { User } from '../model/user.model';
import { UserRepository } from '../repository/user.repository';
import { InvalidCredentialsError } from '../error/invalid-credentials.error';
import { UserNotFoundError } from '../error/user-not-found.error';
import {
  authenticationMiddleware,
  authorizeMiddleware,
} from '../auth.middleware';
import { UserRole } from '../enum/user-role.enum';

export class AuthController extends AbstractController {
  public readonly path = '/api/v1/auth';
  public readonly router = Router();
  public readonly repository = new UserRepository(User);

  constructor() {
    super();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.route(this.path).post(this.signIn);

    // this.router.all('*', this.handleRoutes);
  }

  private handleRoutes = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ) => {
    const error = {
      codeAttr: Code.NOT_FOUND,
      detail: `페이지 ${request.originalUrl}는 존재하지 않습니다.`,
      isOperational: true,
    };

    next(error);
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
            true,
          ),
        );
      }

      const user = await this.repository.find({ email });

      if (!user) {
        return next(
          new InvalidCredentialsError(
            Code.BAD_REQUEST,
            '이메일 혹은 비밀번호가 정확하지 않습니다.',
            true,
          ),
        );
      }

      const match = await user.matchPassword(password, user.password);

      if (!match) {
        return next(
          new InvalidCredentialsError(
            Code.BAD_REQUEST,
            '이메일 혹은 비밀번호가 정확하지 않습니다.',
            true,
          ),
        );
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRATION,
      });

      const success = ApiResponse.handleSuccess(
        Code.OK.code,
        Code.OK.message,
        token,
        '로그인 했습니다.',
      );

      response.status(Code.OK.code).json(success);
    },
  );
}
