import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

import {
  Code,
  RequestWithUser,
  UserPayload,
  catchAsync,
} from '@whooatour/common';

import { UnauthenticatedUserError } from './error/unauthenticated-user.error';
import { User } from './model/user.model';
import { UserNotFoundError } from './error/user-not-found.error';
import { InvalidJwtAfterPasswordUpdateError } from './error/invalid-jwt-after-password-update.error';
import { UserRepository } from './repository/user.repository';

// TODO: 반환형 명시.
const promisifiedJwtVerify = (token: string, secret: string) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, {}, (error, decoded) => {
      if (error) {
        reject(error);
      } else {
        resolve(decoded);
      }
    });
  });
};

export const authMiddleware = catchAsync(
  async (request: RequestWithUser, response: Response, next: NextFunction) => {
    let token = null;

    /* 1. 토큰을 추출한다. */
    if (
      request.headers.authorization &&
      request.headers.authorization.startsWith('Bearer')
    ) {
      token = request.headers.authorization.split(' ')[1];
    }

    console.log(token);

    if (!token) {
      return next(
        new UnauthenticatedUserError(
          Code.UNAUTHORIZED,
          '로그인이 필요합니다',
          true,
        ),
      );
    }

    /* 2. 토큰을 검증한다. */
    /* 콜백함수를 프로미스로 변형한다. */
    const decoded = (await promisifiedJwtVerify(
      token,
      process.env.JWT_SECRET,
    )) as {
      id: Types.ObjectId;
      iat: number;
      exp: number;
    };

    /* 3. 사용자가 존재하는지 확인한다. */
    const repository = new UserRepository(User);
    const user = await repository.find({ _id: decoded.id });
    if (!user) {
      return next(
        new UserNotFoundError(
          Code.NOT_FOUND,
          '사용자가 존재하지 않습니다',
          true,
        ),
      );
    }

    /* 4. 토큰 발행 후 비밀번호를 수정했는지 확인한다. */
    if (user.isPasswordUpdatedAfterJwtIssued(decoded.iat)) {
      return next(
        new InvalidJwtAfterPasswordUpdateError(
          Code.JWT_AFTER_PASSWORD_UPDATE_ERROR,
          '로그인이 필요합니다.',
          true,
        ),
      );
    }

    /* 접근 제어되는 경로에 접근을 허락한다. */
    const userPayload: UserPayload = {
      id: user._id,
    };

    request.user = userPayload;

    next();
  },
);
