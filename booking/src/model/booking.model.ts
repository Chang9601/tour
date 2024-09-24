import mongoose from 'mongoose';
import { updateIfCurrentPlugin } from 'mongoose-update-if-current';

import { BookingStatus } from '@whooatour/common';

import { TourDocument } from './tour.model';

interface BookingAttribute {
  expiration: Date;
  status: BookingStatus;
  tour: TourDocument;
  userId: string;
}

export interface BookingDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  expiration: Date;
  status: BookingStatus;
  tour: TourDocument;
  userId: mongoose.Types.ObjectId;
  sequence: number;
}

export interface BookingModel extends mongoose.Model<BookingDocument> {
  build(attrs: BookingAttribute): Promise<BookingDocument>;
}

type BookingFindQuery = mongoose.Query<
  BookingDocument | BookingDocument[],
  BookingDocument,
  {},
  BookingDocument,
  'find' | 'findOne'
>;

const bookingSchema = new mongoose.Schema(
  {
    expiration: {
      type: Date,
      required: [true, '만료 기간이 있어야 합니다.'],
    },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.Pending,
      required: [true, '예약 상태가 있어야 합니다.'],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      requird: [true, '예약 도큐먼트가 있어야 합니다.'],
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

bookingSchema.pre(/^find/, function (this: BookingFindQuery, next) {
  this.find({ status: { $ne: BookingStatus.Cancelled } });
  /* find() 계열 메서드에서 tour를 채운다. */
  this.populate({
    path: 'tour',
  });

  next();
});

bookingSchema.set('versionKey', 'sequence');
bookingSchema.plugin(updateIfCurrentPlugin);

bookingSchema.statics.build = async function (attrs: BookingAttribute) {
  return await Booking.create(attrs);
};

export const Booking = mongoose.model<BookingDocument, BookingModel>(
  'Booking',
  bookingSchema,
);
