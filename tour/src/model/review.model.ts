import mongoose from 'mongoose';
import { updateIfCurrentPlugin } from 'mongoose-update-if-current';

import { TourDocument } from './tour.model';

interface ReviewDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  rating: number;
  tour: TourDocument;
  sequence: number;
}

interface ReviewModel extends mongoose.Model<ReviewDocument> {}

const reviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: [true, ' 평점이 있어야 합니다.'],
      min: [1, '최소평점은 1점입니다.'],
      max: [5, '최대평점은 5점입니다.'],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      requird: [true, '예약 도큐먼트가 있어야 합니다.'],
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

/* 여행과 사용자의 조합을 유일하게 만드는 복합 인덱스. */
//reviewSchema.index({ tourId: 1, userId: 1 }, { unique: true });

reviewSchema.set('versionKey', 'sequence');
/*
 * Mongoose 도큐먼트에 낙관적 동시성 제어 기능을 제공하는 플러그인이다.
 * 저장(save) 시 도큐먼트 버전 번호를 증가시켜 이전 버전의 도큐먼트가 현재 버전을 덮어쓰지 못하도록 방지한다.
 * 낙관적 동시성 제어 기능은 수정 연산과 주로 관련되어 있다.
 */
reviewSchema.plugin(updateIfCurrentPlugin);

// reviewSchema.statics.calculateAverageRating = async function (
//   tourId: mongoose.Types.ObjectId
// ) {
//   const statistics = await this.aggregate([
//     {
//       $match: { tourId: tourId },
//     },
//     {
//       $group: {
//         _id: '$tourId',
//         countRating: { $sum: 1 },
//         averageRating: { $avg: '$rating' },
//       },
//     },
//   ]);

//   // TODO: 여행의 평점 개수(ratingCount)와 평점 값(ratingAverage)을 수정한다.
// };

// reviewSchema.post('save', function () {
//   this.constructor.calculateAverageRating(this.tourId);
// });

// /**
//  * findByIdAndUpdate() 와 findByIdAndDelete()는 findOneAnd를 기반으로 한다.
//  * 따라서, findOneAnd를 사용한다.
//  */
// reviewSchema.pre(/^findOneAnd/, async function (next) {
//   this.r = await this.findOne();

//   next();
// });

// reviewSchema.post(/^findOneAnd/, async function () {
//   /* await this.findOne(); 쿼리가 이미 실행되어서 작동하지 않는다. */
//   await this.r.calculateAverageRating(this.r.tour);
// });

const Review = mongoose.model<ReviewDocument, ReviewModel>(
  'Review',
  reviewSchema,
);

export { Review, ReviewModel, ReviewDocument };
