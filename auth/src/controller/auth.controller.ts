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

export class AuthController extends AbstractController {
  public readonly path = '/api/v1/auth';
  public readonly router = Router();
  public readonly repository = new UserRepository(User);

  constructor() {
    super();

    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // this.router
    //   .route(`${this.path}/:id`)
    //   .get(this.getTour)
    //   .patch(this.updateTour)
    //   .delete(this.deleteTour);

    this.router.route(this.path).post(this.signIn);

    this.router.all('*', this.handleRoutes);
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
      }
    },
  );
}
