import mongoose from 'mongoose';

interface ReviewAttr {
  title: string;
  content: string;
  rating: number;
  tourId: string;
  userId: string;
}

interface ReviewDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  content: string;
  rating: number;
  tourId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
}

interface ReviewModel extends mongoose.Model<ReviewDocument> {
  build(attrs: ReviewAttr): Promise<ReviewDocument>;
}

const reviewSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, '제목이 있어야 합니다.'],
      trim: true,
      maxlength: [50, '제목은 50자 이하입니다.'],
      minlength: [10, '제목은 10자 이상입니다.'],
    },
    content: {
      type: String,
      required: [true, '내용이 있어야 합니다.'],
      trim: true,
      maxlength: [2000, '내용은 2000자 이하입니다.'],
      minlength: [100, '내용은 100자 이상입니다.'],
    },
    rating: {
      type: Number,
      required: [true, ' 평점이 있어야 합니다.'],
      min: [1, '최소평점은 1점입니다.'],
      max: [5, '최대평점은 5점입니다.'],
    },
    tourId: {
      type: mongoose.Schema.ObjectId,
      required: [true, '여행 아이디가 있어야 합니다.'],
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
  }
);

/* 여행과 사용자의 조합을 유일하게 만드는 복합 인덱스. */
reviewSchema.index({ tourId: 1, userId: 1 }, { unique: true });

reviewSchema.statics.build = async function (attrs: ReviewAttr) {
  return await Review.create(attrs);
};

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
  reviewSchema
);

export { Review, ReviewModel, ReviewDocument };
