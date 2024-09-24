import mongoose from 'mongoose';
import { updateIfCurrentPlugin } from 'mongoose-update-if-current';

import { TourDocument } from './tour.model';

type ReviewRating = {
  ratingsAverage: number;
  ratingsCount: number;
};

interface ReviewAttribute {
  content: string;
  rating: number;
  title: string;
  tour: string;
  userId: string;
}

interface ReviewDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  content: string;
  rating: number;
  title: string;
  tour: TourDocument;
  userId: mongoose.Types.ObjectId;
  sequence: number /* sequence는 도큐먼트 인터페이스에 없기 때문에 직접 정의한다. */;
}

interface ReviewModel extends mongoose.Model<ReviewDocument> {
  build(attrs: ReviewAttribute): Promise<ReviewDocument>;
  calculateAverageRating(
    tourId: mongoose.Types.ObjectId,
  ): Promise<ReviewRating>;
}

type ReviewFindQuery = mongoose.Query<
  ReviewDocument | ReviewDocument[],
  ReviewDocument,
  {},
  ReviewFindQuery,
  'find' | 'findOne'
>;

const reviewSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, '내용이 있어야 합니다.'],
      trim: true,
      maxlength: [2000, '내용은 2000자 이하입니다.'],
      minlength: [100, '내용은 100자 이상입니다.'],
    },
    title: {
      type: String,
      required: [true, '제목이 있어야 합니다.'],
      trim: true,
      maxlength: [50, '제목은 50자 이하입니다.'],
      minlength: [10, '제목은 10자 이상입니다.'],
    },
    rating: {
      type: Number,
      required: [true, ' 평점이 있어야 합니다.'],
      min: [1, '최소평점은 1점입니다.'],
      max: [5, '최대평점은 5점입니다.'],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, '여행 도큐먼트가 있어야 합니다.'],
    },
    userId: {
      type: mongoose.Schema.ObjectId,
      required: [true, '사용자 아이디가 있어야 합니다.'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    updatedAt: {
      type: Date,
      select: false,
    },
    deletedAt: {
      type: Date,
      select: false,
    },
  },
  {
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(document, pojo) {
        delete pojo._id;
      },
    },
    toObject: { virtuals: true, versionKey: false },
  },
);

reviewSchema.pre('save', function (next) {
  if (this.isNew) {
    return next();
  }

  this.updatedAt = new Date(Date.now());

  next();
});

reviewSchema.pre(/^find/, function (this: ReviewFindQuery, next) {
  this.populate({
    path: 'tour',
  });

  next();
});

/* 여행과 사용자의 조합을 유일하게 만드는 복합 인덱스로 중복 리뷰를 방지한다. */
reviewSchema.index({ tour: 1, userId: 1 }, { unique: true });
reviewSchema.index({ title: 1 });

reviewSchema.set('versionKey', 'sequence');
/*
 * Mongoose 도큐먼트에 낙관적 동시성 제어 기능을 제공하는 플러그인이다.
 * 저장(save) 시 도큐먼트 버전 번호를 증가시켜 이전 버전의 도큐먼트가 현재 버전을 덮어쓰지 못하도록 방지한다.
 *
 * 낙관적 동시성 제어(OCC)는 여러 트랜잭션이 서로 간섭하지 않고 자주 완료될 수 있다고 가정한다.
 * 트랜잭션이 실행되는 동안 트랜잭션은 데이터 자원을 잠금(lock) 없이 사용한다.
 * 커밋하기 전에, 각 트랜잭션은 다른 트랜잭션이 자신이 읽은 데이터를 수정하지 않았는지 확인한다.
 * 만약 이 확인 과정에서 충돌하는 수정이 발견되면 커밋 중인 트랜잭션은 롤백되고 다시 시작할 수 있다.
 */
reviewSchema.plugin(updateIfCurrentPlugin);

reviewSchema.statics.build = async function (
  attrs: ReviewAttribute,
): Promise<ReviewDocument> {
  return await Review.create(attrs);
};

reviewSchema.statics.calculateAverageRating = async function (
  tourId: mongoose.Types.ObjectId,
): Promise<ReviewRating> {
  const statistics = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        ratingsCount: { $sum: 1 },
        ratingsAverage: { $avg: '$rating' },
      },
    },
  ]);

  console.log(statistics);

  return statistics.length > 0
    ? statistics[0]
    : { ratingsCount: 0, ratingsAverage: 0 };
};

/*
 * pre의 경우 현재 리뷰 도큐먼트가 컬렉션에 저장되어 있지않다.
 * post의 경우 도큐먼트가 데이터베이스에 저장된 상태이다.
 */
// reviewSchema.post('save', function (this: any) {
//   this.constructor.calculateAverageRating(this.tour);
// });

/**
 * findByIdAndUpdate() 와 findByIdAndDelete()는 findOneAnd를 기반으로 한다.
 * 따라서, findOneAnd를 사용한다.
 */
// reviewSchema.pre(/^findOneAnd/, async function (this: any, next) {
//   this.r = await this.findOne();

//   next();
// });

// reviewSchema.post(/^findOneAnd/, async function (this: any, next) {
//   /* await this.findOne(); 쿼리가 이미 실행되어서 작동하지 않는다. */
//   await this.r.constructor.calculateAverageRating(this.r.tour);
// });

const Review = mongoose.model<ReviewDocument, ReviewModel>(
  'Review',
  reviewSchema,
);

export { Review, ReviewModel, ReviewDocument };
