import { ValidationChain, checkSchema } from 'express-validator';
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema';

import {
  Code,
  isAllowedFileExtension,
  NotAllowedFileExtensionError,
} from '@whooatour/common';

import { PasswordMismatchError } from '../error/password-mismatch.error';

export class UserValidator {
  public static create(): RunnableValidationChains<ValidationChain> {
    return checkSchema(
      {
        email: {
          isEmail: { errorMessage: '유효하지 않은 형식의 이메일입니다.' },
          trim: true,
        },
        name: {
          isString: { errorMessage: '이름은 문자로만 구성됩니다.' },
          isLength: {
            options: { min: 2 },
            errorMessage: '이름은 2자 이상입니다.',
          },
          trim: true,
        },
        password: {
          isStrongPassword: {
            errorMessage: '유효하지 않은 형식의 비밀번호입니다.',
          },
          isLength: {
            options: { min: 8, max: 20 },
            errorMessage: '비밀번호는 8자리 이상 20자리 이하입니다.',
          },
        },
        passwordConfirm: {
          custom: {
            options: (value, { req }) => {
              if (value !== req.body.password) {
                throw new PasswordMismatchError(
                  Code.BAD_REQUEST,
                  '비밀번호가 일치하지 않습니다.',
                );
              }

              return true;
            },
          },
        },
        photo: {
          optional: true,
          custom: {
            options: (value) => {
              if (!isAllowedFileExtension(value)) {
                throw new NotAllowedFileExtensionError(
                  Code.BAD_REQUEST,
                  '허용되지 않는 파일 확장자입니다.',
                );
              }
            },
          },
        },
      },
      ['body'],
    );
  }

  public static update() {
    return checkSchema(
      {
        email: {
          optional: true,
          isEmail: { errorMessage: '유효하지 않은 형식의 이메일입니다.' },
          trim: true,
        },
        name: {
          optional: true,
          isString: { errorMessage: '이름은 문자로만 구성됩니다.' },
          isLength: {
            options: { min: 2 },
            errorMessage: '이름은 2자 이상입니다.',
          },
          trim: true,
        },
        photo: {
          optional: true,
          isString: { errorMessage: '사진이 있어야 합니다.' },
        },
      },
      ['body'],
    );
  }
}
