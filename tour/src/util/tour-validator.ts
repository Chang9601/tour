import { ValidationChain, checkSchema } from 'express-validator';
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema';

export class TourValidator {
  public static create(): RunnableValidationChains<ValidationChain> {
    return checkSchema(
      {
        name: {
          isString: { errorMessage: '이름이 있어야 합니다.' },
          isLength: {
            options: { min: 2, max: 20 },
            errorMessage: '이름은 2자 이상 20자 이하입니다.',
          },
          trim: true,
        },
        duration: {
          isInt: {
            options: { min: 1, max: 365 },
            errorMessage: '기간은 1일 이상 365일 이하입니다.',
          },
        },
        groupSize: {
          isInt: {
            options: { min: 1, max: 100 },
            errorMessage: '그룹은 1명 이상 100명 이하입니다.',
          },
        },
        difficulty: {
          isIn: {
            options: [['상', '중', '하']],
            errorMessage: '난이도는 상, 중, 하 중 하나입니다.',
          },
        },
        price: {
          isInt: {
            options: { min: 100000 },
            errorMessage: '정상가는 100000원 이상입니다.',
          },
        },
        discount: {
          custom: {
            options: (value, { req }) => {
              if (value > req.body.price) {
                // TODO: 맟춤 오류 클래스.
                throw new Error('할인가는 정상가보다 작아야 합니다.');
              }

              return true;
            },
          },
        },
        summary: {
          isString: { errorMessage: '요약문이 있어야 합니다.' },
          trim: true,
        },
        coverImage: {
          isString: { errorMessage: '표지 이미지가 있어야 합니다.' },
          trim: true,
        },
      },
      ['body'],
    );
  }

  public static update() {
    return checkSchema(
      {
        name: {
          optional: true,
          isString: { errorMessage: '이름이 있어야 합니다.' },
          isLength: {
            options: { min: 2, max: 20 },
            errorMessage: '이름은 2자 이상 20자 이하입니다.',
          },
          trim: true,
        },
        duration: {
          optional: true,
          isInt: {
            options: { min: 1, max: 365 },
            errorMessage: '기간은 1일 이상 365일 이하입니다.',
          },
        },
        groupSize: {
          optional: true,
          isInt: {
            options: { min: 1, max: 100 },
            errorMessage: '그룹은 1명 이상 100명 이하입니다.',
          },
        },
        difficulty: {
          optional: true,
          isIn: {
            options: [['상', '중', '하']],
            errorMessage: '난이도는 상, 중, 하 중 하나입니다.',
          },
        },
        price: {
          optional: true,
          isInt: {
            options: { min: 100000 },
            errorMessage: '정상가는 100000원 이상입니다.',
          },
        },
        discount: {
          optional: true,
          custom: {
            options: (value, { req }) => {
              if (value > req.body.price) {
                throw new Error('할인가는 정상가보다 작아야 합니다.');
              }

              return true;
            },
          },
        },
        summary: {
          optional: true,
          isString: { errorMessage: '요약문이 있어야 합니다.' },
          trim: true,
        },
        coverImage: {
          optional: true,
          isString: { errorMessage: '표지 이미지가 있어야 합니다.' },
          trim: true,
        },
      },
      ['body'],
    );
  }
}
