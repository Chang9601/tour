import * as crypto from 'crypto';

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
import { UserValidator } from '../util/user-validator';
import { UserNotFoundError } from '../error/user-not-found.error';
import {
  authenticationMiddleware,
  authorizeMiddleware,
} from '../auth.middleware';
import { EmailMessage } from '../type/email-message';
import { EmailUtil } from '../util/email-util';
import { EmailSendError } from '../error/email-send.error';
import { UserRole } from '../enum/user-role.enum';

export class UserController extends AbstractController {
  public readonly path = '/api/v1/users';
  public readonly router = Router();
  public readonly repository = new UserRepository(User);

  constructor() {
    super();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router
      .route(this.path)
      .post(...validationMiddleware(UserValidator.create()), this.createUser);

    this.router
      .route(`${this.path}/:id`)
      .get(
        authenticationMiddleware,
        authorizeMiddleware(UserRole.Admin),
        this.getUser,
      );

    this.router
      .route(`${this.path}/forget-password`)
      .post(authenticationMiddleware, this.forgetPassword);

    this.router
      .route(`${this.path}/reset-password/:token`)
      .patch(authenticationMiddleware, this.resetPassword);

    // this.router.all('*', this.handleRoutes);
  }

  // TODO: 추상 컨트롤러에서 구현.
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

  private createUser = catchAsync(
    async (
      request: Request,
      response: Response,
      next: NextFunction,
    ): Promise<void> => {
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
       * 데이터베이스에 갱신하려면 저장해야 한다.
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
        await EmailUtil.sendEmail(emailMessage);

        const success = ApiResponse.handleSuccess(
          Code.OK.code,
          Code.OK.message,
          null,
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
       * 갱신 시 여행(findOneAnddUpdate() 메서드)과 달리  save() 메서드를 사용한다.
       * 유효성 검사와 비밀번호 암호화와 같은 작업을 실행해야 하기 때문이다.
       */
      await user.save();

      /* 3. 비밀번호 변경 타임스탬프 필드를 갱신한다. */
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
