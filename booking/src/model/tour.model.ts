import mongoose from 'mongoose';
import { updateIfCurrentPlugin } from 'mongoose-update-if-current';

import { BookingStatus } from '@whooatour/common';

import { Booking } from './booking.model';

interface TourAttribute {
  difficulty: string;
  duration: number;
  groupSize: number;
  name: string;
  price: number;
}

interface TourDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  difficulty: string;
  discount: number;
  duration: number;
  groupSize: number;
  name: string;
  price: number;
  sequence: number;
  isBooked(): Promise<boolean>;
}

interface TourModel extends mongoose.Model<TourDocument> {
  build(attrs: TourAttribute): Promise<TourDocument>;
}

const tourSchema = new mongoose.Schema(
  {
    difficulty: {
      type: String,
      required: [true, '난이도가 있어야 합니다.'],
      enum: {
        values: ['상', '중', '하'],
        message: '난이도는 상, 중, 하 중 하나입니다.',
      },
    },
    discount: {
      type: Number,
      validate: {
        message: '할인가({VALUE})는 정상가보다 작아야 합니다.',

        validator: function (this: TourDocument, value: number) {
          return value < this.price;
        },
      },
    },
    duration: {
      type: Number,
      required: [true, ' 기간이 있어야 합니다.'],
      min: [1, '기간은 1일 이상입니다.'],
      max: [365, '기간은 365일 이하입니다.'],
    },
    groupSize: {
      type: Number,
      required: [true, ' 여행객의 인원이 있어야 합니다.'],
      min: [1, '그룹은 1명 이상입니다.'],
      max: [100, '그룹은 100명 이하입니다.'],
    },
    name: {
      type: String,
      required: [true, '이름이 있어야 합니다.'],
      unique: true,
      trim: true,
      maxlength: [20, '이름은 20자 이하입니다.'],
      minlength: [2, '이름은 2자 이상입니다.'],
    },
    price: {
      type: Number,
      required: [true, '가격이 있어야 합니다.'],
      min: [100000, '가격은 100000원 이상입니다.'],
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

tourSchema.set('versionKey', 'sequence');
tourSchema.plugin(updateIfCurrentPlugin);

tourSchema.statics.build = async function (attrs: TourAttribute) {
  return await Tour.create(attrs);
};

tourSchema.methods.isBooked = async function () {
  const isBooked = await Booking.findOne({
    tour: this,
    status: {
      $in: [
        BookingStatus.Pending,
        BookingStatus.Confirmed,
        BookingStatus.Completed,
      ],
    },
  });

  return !!isBooked;
};

const Tour = mongoose.model<TourDocument, TourModel>('Tour', tourSchema);

export { Tour, TourModel, TourDocument };
