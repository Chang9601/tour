import mongoose from 'mongoose';
import { updateIfCurrentPlugin } from 'mongoose-update-if-current';

interface TourAttribute {
  name: string;
}

interface TourDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  sequence: number;
}

interface TourModel extends mongoose.Model<TourDocument> {
  build(attrs: TourAttribute): Promise<TourDocument>;
}

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, '이름이 있어야 합니다.'],
      unique: true,
      trim: true,
      maxlength: [20, '이름은 20자 이하입니다.'],
      minlength: [2, '이름은 2자 이상입니다.'],
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

tourSchema.set('versionKey', 'sequence');
tourSchema.plugin(updateIfCurrentPlugin);

tourSchema.statics.build = async function (attrs: TourAttribute) {
  return await Tour.create(attrs);
};

const Tour = mongoose.model<TourDocument, TourModel>('Tour', tourSchema);

export { Tour, TourModel, TourDocument };
