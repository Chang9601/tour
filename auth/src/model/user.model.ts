import * as crypto from 'crypto';

import * as bcryptjs from 'bcryptjs';
import mongoose, { Query } from 'mongoose';
import validator from 'validator';

import { OAuth2Provider, Optional, UserRole } from '@whooatour/common';

interface UserAttribute {
  email: string;
  name: string;
  password: string;
  passwordConfirm: string;
  photo?: string;
  userRole?: string;
}

export interface UserDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  active: boolean;
  banned: boolean;
  email: string;
  name: string;
  oAuth2Provider: string;
  oAuth2AccessToken: string;
  oAuth2ProviderId: string;
  oAuth2RefreshToken: string;
  password: string;
  passwordResetToken: Optional<string>;
  passwordResetTokenExpiration: Optional<Date>;
  photo: string;
  refreshToken: string;
  userRole: UserRole;
  sequence: number;
  matchPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
  isPasswordUpdatedAfterJwtIssued(jwtTimestamp: number): boolean;
  createPasswordResetToken(): string;
}

export interface UserModel extends mongoose.Model<UserDocument> {
  build(attrs: UserAttribute): Promise<UserDocument>;
}

type UserFindQuery = Query<
  UserDocument | UserDocument[],
  UserDocument,
  {},
  UserDocument,
  'find' | 'findOne'
>;

const userSchema = new mongoose.Schema(
  {
    active: {
      type: Boolean,
      default: true,
    },
    banned: {
      type: Boolean,
      default: false,
    },
    email: {
      type: String,
      required: [true, '이메일이 있어야 합니다.'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, '잘못된 형식의 이메일입니다.'],
    },
    name: {
      type: String,
      required: [true, '이름이 있어야 합니다.'],
      trim: true,
      minlength: [2, '이름은 2자 이상입니다.'],
    },
    oAuth2Provider: {
      type: String,
      required: true,
      enum: Object.values(OAuth2Provider),
      default: OAuth2Provider.Local,
    },
    oAuth2AccessToken: String,
    oAuth2ProviderId: String,
    oAuth2RefreshToken: String,
    password: {
      type: String,
      required: [true, '비밀번호가 있어야 합니다'],
      minlength: [8, '비밀번호는 8자리 이상입니다'],
      maxlength: [20, '비밀번호는 20자리 이하입니다.'],
      trim: true,
      /* create() 메서드와 save() 메서드에만 작동한다. */
      validate: [validator.isStrongPassword, '잘못된 형식의 비밀번호입니다.'],
    },
    passwordResetToken: String,
    passwordResetTokenExpiration: Date,
    /* 쿼리(find() 계열 메서드)에서 필드가 나오지 않지만 save() 메서드나 create() 메서드의 경우 적용되지 않는다. */
    passwordUpdatedAt: { type: Date, select: false },
    photo: {
      type: String,
      default: 'none.jpg',
    },
    refreshToken: String,
    userRole: {
      type: String,
      required: true,
      enum: Object.values(UserRole),
      default: UserRole.User,
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
        /* select: false여도 save() 메서드나 create() 메서드 사용 시 응답에 나오기 때문에 제거한다. */
        delete pojo.createdAt;
        delete pojo.password;
        delete pojo.passwordResetToken;
        delete pojo.passwordResetTokenExpiration;
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

  this.password = await bcryptjs.hash(this.password, 12);

  next();
});

userSchema.pre('save', function (next) {
  if (this.isNew) {
    return next();
  }

  this.updatedAt = new Date(Date.now());

  next();
});

userSchema.pre('save', function (next) {
  /* 비밀번호가 변경되지 않았거나 새로운 도큐먼트인 경우 넘어간다. */
  if (!this.isModified('password') || this.isNew) {
    return next();
  }

  /*
   * passwordUpdatedAt가 존재하는 이유는 JWT 토큰의 타임스탬프와 비교를 위해서다.
   * 즉, JWT 토큰이 발급된 후에 비밀번호를 변경했는지 확인
   * JWT 토큰이 비밀번호 수정 타임스탬프 전에 생성될 수 있기 때문에 1초를 가감한다. */
  const now = new Date(Date.now() - 1000);
  this.passwordUpdatedAt = now;

  next();
});

userSchema.pre(/^find/, function (this: UserFindQuery, next) {
  /*
   * this는 현재 쿼리를 가리킨다.
   * 삭제(즉, 비활성화)된 사용자는 목록에서 제외한다.
   */
  this.find({ active: true });

  next();
});

/* statics는 모델에 정의된 메서드이다. */
userSchema.statics.build = async function (attrs: UserAttribute) {
  return await User.create(attrs);
};

/* methods는 도큐먼트(인스턴스)에 정의된 메서드이다. */
userSchema.methods.matchPassword = async function (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return await bcryptjs.compare(plainPassword, hashedPassword);
};

userSchema.methods.isPasswordUpdatedAfterJwtIssued = function (
  jwtTimestamp: number,
): boolean {
  if (this.passwordUpdatedAt) {
    const timestamp = parseInt(this.passwordUpdatedAt.getTime(), 10) / 1000;

    return jwtTimestamp < timestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function (): string {
  /*
   * 비밀번호 재설정 토큰은 사용자에게 보내지며 이를 사용해서 새 비밀번호를 생성할 수 있다.
   * 비밀번호 재설정 토큰에 접근할 수 있는 사람은 사용자뿐이다. 그래서 실제로 비밀번호처럼 작동한다.
   * 본질적으로 비밀번호와 같기 때문에 공격자가 데이터베이스에 접근할 경우 새 비밀번호를 설정하여 계정에 접근할 수 있다.
   * 비밀번호 재설정 토큰을 데이터베이스에 그냥 저장한다면 공격자가 데이터베이스에 접근하고 비밀번호 재설정 토큰을 사용하여 새 비밀번호를 생성할 수 있다.
   * 즉, 공격자가 계정을 제어한다. 따라서, 비밀번호와 마찬가지로 비밀번호 재설정 토큰을 평문으로 데이터베이스에 저장해서는 안 된다.
   * 하지만 비밀번호와는 달리 매우 강력한 암호화 방법은 필요하지 않기에 내장 crypto 모듈을 사용한다.
   */
  const passwordResetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(passwordResetToken)
    .digest('hex');

  this.passwordResetTokenExpiration = new Date(Date.now() + 10 * 60 * 1000);

  /* 비밀번호처럼 암호문만 데이터베이스에 저장한다. */
  return passwordResetToken;
};

/* 공통 라이브러리에 저장된 사용자 모델을 가져온 후 [NodeJS] Error : Cannot overwrite 발생한다. */
mongoose.deleteModel('User');

export const User = mongoose.model<UserDocument, UserModel>('User', userSchema);
