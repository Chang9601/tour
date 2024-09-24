import mongoose from 'mongoose';
import { updateIfCurrentPlugin } from 'mongoose-update-if-current';

interface PaymentAttribute {
  bookingId: mongoose.Types.ObjectId;
  chargeId: string;
}

interface PaymentDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  chargeId: string;
  userId: mongoose.Types.ObjectId;
  sequence: number;
}

interface PaymentModel extends mongoose.Model<PaymentDocument> {
  build(attrs: PaymentAttribute): Promise<PaymentDocument>;
}

const PaymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Types.ObjectId,
      required: [true, '예약 아이디가 필요합니다.'],
    },
    chargeId: { type: String, requird: [true, '청구 아이디가 필요합니다.'] },
    userId: {
      type: mongoose.Types.ObjectId,
      required: [true, '사용자 아이디가 필요합니다.'],
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

PaymentSchema.set('versionKey', 'sequence');
PaymentSchema.plugin(updateIfCurrentPlugin);

PaymentSchema.statics.build = async function (attrs: PaymentAttribute) {
  return await Payment.create(attrs);
};

const Payment = mongoose.model<PaymentDocument, PaymentModel>(
  'Payment',
  PaymentSchema,
);

export { Payment, PaymentModel, PaymentDocument };
