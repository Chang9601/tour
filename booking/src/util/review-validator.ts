import { ValidationChain, checkSchema } from 'express-validator';
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema';

export class ReviewValidator {
  public static create(): RunnableValidationChains<ValidationChain> {
    return checkSchema(
      {
        title: {
          isString: { errorMessage: '제목이 있어야 합니다.' },
          isLength: {
            options: { min: 10, max: 50 },
            errorMessage: '제목은 10자 이상 50자 이하입니다.',
          },
          trim: true,
        },
        content: {
          isString: { errorMessage: '내용이 있어야 합니다.' },
          isLength: {
            options: { min: 100, max: 2000 },
            errorMessage: '내용은 100 이상 2000자 이하입니다.',
          },
          trim: true,
        },
        rating: {
          isInt: {
            options: { min: 1, max: 5 },
            errorMessage: '평점은 1점 이상 5점 이하입니다.',
          },
        },
      },
      ['body']
    );
  }

  public static update() {
    return checkSchema(
      {
        title: {
          optional: true,
          isString: { errorMessage: '제목이 있어야 합니다.' },
          isLength: {
            options: { min: 10, max: 50 },
            errorMessage: '제목은 10자 이상 50자 이하입니다.',
          },
          trim: true,
        },
        content: {
          optional: true,
          isString: { errorMessage: '내용이 있어야 합니다.' },
          isLength: {
            options: { min: 100, max: 2000 },
            errorMessage: '내용은 100자 이상 2000자 이하입니다.',
          },
          trim: true,
        },
        rating: {
          optional: true,
          isInt: {
            options: { min: 1, max: 5 },
            errorMessage: '평점은 1점 이상 5점 이하입니다.',
          },
        },
      },
      ['body']
    );
  }
}
