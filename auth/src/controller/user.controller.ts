import { NextFunction, Request, Response, Router } from 'express';

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

    // this.router
    //   .route(`${this.path}/:id`)
    //   .get(this.getTour)
    //   .patch(this.updateTour)
    //   .delete(this.deleteTour);

    this.router.all('*', this.handleRoutes);
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
}
