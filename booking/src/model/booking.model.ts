import mongoose from 'mongoose';

interface BookingAttr {
  title: string;
  content: string;
  rating: number;
  tourId: string;
  userId: string;
}

interface BookingDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  content: string;
  rating: number;
  tourId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
}

interface BookingModel extends mongoose.Model<BookingDocument> {
  build(attrs: BookingAttr): Promise<BookingDocument>;
}

const bookingSchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      required: [true, '가격이 있어야 합니다.'],
    },
    paid: {
      type: Boolean,
      default: true,
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

bookingSchema.statics.build = async function (attrs: BookingAttr) {
  return await Booking.create(attrs);
};

const Booking = mongoose.model<BookingDocument, BookingModel>(
  'Review',
  bookingSchema
);

export { Booking, BookingModel, BookingDocument };
