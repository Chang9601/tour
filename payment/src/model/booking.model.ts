import mongoose from 'mongoose';
import { updateIfCurrentPlugin } from 'mongoose-update-if-current';

import { BookingStatus } from '@whooatour/common';

interface BookingAttribute {
  price: number;
  status: BookingStatus;
  userId: string;
}

interface BookingDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  price: number;
  status: BookingStatus;
  userId: mongoose.Types.ObjectId;
  sequence: number;
}

interface BookingModel extends mongoose.Model<BookingDocument> {
  build(attrs: BookingAttribute): Promise<BookingDocument>;
}

const bookingSchema = new mongoose.Schema(
  {
    price: Number,
    status: {
      type: String,
      required: true,
      enum: Object.values(BookingStatus),
      default: BookingStatus.Pending,
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
