import mongoose, { Types } from 'mongoose';
import validator from 'validator';
import * as bcryptjs from 'bcryptjs';

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
      required: [true, '이름이 있어야 합니다.'],
      trim: true,
      minlength: [2, '이름은 2자 이상입니다.'],
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
      minlength: [8, '비밀번호는 8자리 이상입니다'],
      maxlength: [20, '비밀번호는 20자리 이하입니다.'],
      trim: true,
      validate: [validator.isStrongPassword, '잘못된 형식의 비밀번호입니다.'],
    },
    photo: String,
  },
  {
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(document, result) {
        delete result._id;
        delete result.password;
      },
    },
    toObject: { virtuals: true, versionKey: false },
  },
);

userSchema.pre('save', async function (next) {
  /* 비밀번호가 변경된 경우만 함수를 실행한다. */
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcryptjs.hash(this.password!, 12);
  next();
});

userSchema.statics.build = async (attrs: UserAttr) => {
  return await User.create(attrs);
};

const User = mongoose.model<UserDocument, UserModel>('User', userSchema);

export { User, UserModel, UserDocument };
