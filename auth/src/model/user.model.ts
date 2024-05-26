import mongoose, { Types } from 'mongoose';
import validator from 'validator';

interface UserAttr {
  name: string;
  email: string;
  password: string;
  photo: string;
}

interface UserDocument extends mongoose.Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  photo: string;
}

interface UserModel extends mongoose.Model<UserDocument> {
  build(attrs: UserAttr): Promise<UserDocument>;
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
      required: [true, '이메일이 있어야 합니다.'],
      unique: true,
      trim: true,
      lowercase: true /* 소문자로 변형한다. */,
      validate: [validator.isEmail, '잘못된 형식의 이메일입니다.'],
    },
    password: {
      type: String,
      required: [true, '비밀번호가 있어야 합니다'],
      minlength: 8,
      trim: true,
    },
    photo: String,
  },
  {
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(document, result) {
        delete result._id;
      },
    },
    toObject: { virtuals: true, versionKey: false },
  }
);

userSchema.statics.build = async (attrs: UserAttr) => {
  return await User.create(attrs);
};

const User = mongoose.model<UserDocument, UserModel>('User', userSchema);

export { User, UserModel, UserDocument };
