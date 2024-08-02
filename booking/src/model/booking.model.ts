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

interface BookingDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  expiration: Date;
  status: BookingStatus;
  tour: TourDocument;
  userId: mongoose.Types.ObjectId;
  sequence: number;
}

interface BookingModel extends mongoose.Model<BookingDocument> {
  build(attrs: BookingAttribute): Promise<BookingDocument>;
}

const bookingSchema = new mongoose.Schema(
  {
    expiration: mongoose.Schema.Types.Date,
    status: {
      type: String,
      required: true,
      enum: Object.values(BookingStatus),
      default: BookingStatus.Pending,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
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

bookingSchema.set('versionKey', 'sequence');
bookingSchema.plugin(updateIfCurrentPlugin);

bookingSchema.statics.build = async function (attrs: BookingAttribute) {
  return await Booking.create(attrs);
};

const Booking = mongoose.model<BookingDocument, BookingModel>(
  'Booking',
  bookingSchema,
);

export { Booking, BookingModel, BookingDocument };
