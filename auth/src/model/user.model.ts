// import * as crypto from 'crypto';

// import mongoose from 'mongoose';
// import validator from 'validator';
// import * as bcryptjs from 'bcryptjs';

// import { UserRole } from '../enum/user-role.enum';
// import { Optional } from '../type/nullish.type';

// interface UserAttr {
//   name: string;
//   email: string;
//   password: string;
//   photo: string;
// }

// interface UserDocument extends mongoose.Document {
//   _id: mongoose.Types.ObjectId;
//   name: string;
//   email: string;
//   password: string;
//   passwordResetToken: Optional<string>;
//   passwordResetTokenExpiration: Optional<Date>;
//   photo: string;
//   userRole: UserRole;
//   matchPassword: (
//     plainPassword: string,
//     hashedPassword: string
//   ) => Promise<boolean>;
//   isPasswordUpdatedAfterJwtIssued: (jwtTimestamp: number) => boolean;
//   createPasswordResetToken: () => string;
// }

// interface UserModel extends mongoose.Model<UserDocument> {
//   build(attrs: UserAttr): Promise<UserDocument>;
// }

// const userSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: [true, '이름이 있어야 합니다.'],
//       trim: true,
//       minlength: [2, '이름은 2자 이상입니다.'],
//     },
//     email: {
//       type: String,
//       required: [true, '이메일이 있어야 합니다.'],
//       unique: true,
//       trim: true,
//       lowercase: true /* 소문자로 변형한다. */,
//       validate: [validator.isEmail, '잘못된 형식의 이메일입니다.'],
//     },
//     password: {
//       type: String,
//       required: [true, '비밀번호가 있어야 합니다'],
//       minlength: [8, '비밀번호는 8자리 이상입니다'],
//       maxlength: [20, '비밀번호는 20자리 이하입니다.'],
//       trim: true,
//       /*
//        * 비밀번호가 출력에 나타나지 않는다.
//        * true로 설정해야 도큐먼트에 나타난다.
//        * 즉, 도큐먼트에 추가해도 false이면 나타나지 않는다.
//        * TODO: 하지만 updatedAt은 select: false라도 오류가 발생하지 않는다?!
//        */
//       //select: false,
//       validate: [validator.isStrongPassword, '잘못된 형식의 비밀번호입니다.'],
//     },
//     photo: String,
//     userRole: {
//       type: String,
//       required: true,
//       enum: Object.values(UserRole),
//       default: UserRole.User,
//     },
//     active: {
//       type: Boolean,
//       default: true,
//       select: false,
//     },
//     // TODO: updatedAt 하나로 통일?
//     passwordUpdatedAt: { type: Date, select: false },
//     passwordResetToken: String,
//     passwordResetTokenExpiration: Date,
//     createdAt: {
//       type: Date,
//       default: Date.now(),
//       select: false,
//     },
//     updatedAt: {
//       type: Date,
//       select: false,
//     },
//     deletedAt: {
//       type: Date,
//       select: false,
//     },
//   },
//   {
//     toJSON: {
//       virtuals: true,
//       versionKey: false,
//       transform(document, pojo) {
//         delete pojo._id;
//         delete pojo.password;
//         delete pojo.passwordResetToken;
//         delete pojo.passwordResetTokenExpiration;
//       },
//     },
//     toObject: { virtuals: true, versionKey: false },
//   }
// );

// userSchema.pre('save', async function (next) {
//   /* 비밀번호가 변경된 경우만 함수를 실행한다. */
//   if (!this.isModified('password')) {
//     return next();
//   }

//   this.password = await bcryptjs.hash(this.password!, 12);

//   next();
// });

// userSchema.pre('save', function (next) {
//   /* 비밀번호가 변경되지 않았거나 새로운 도큐먼트인 경우 넘어간다. */
//   if (!this.isModified('password') || this.isNew) {
//     return next();
//   }

//   const now = new Date(Date.now() - 1000);
//   this.passwordUpdatedAt = now;

//   next();
// });

// userSchema.pre('find', function (next) {
//   /* 삭제(즉, 비활성화)된 사용자는 목록에서 제외한다. */
//   this.find({ active: true });

//   next();
// });

// /* statics는 모델에 정의된 메서드이다. */
// userSchema.statics.build = async function (attrs: UserAttr) {
//   return await User.create(attrs);
// };

// /* methods는 도큐먼트(인스턴스)에 정의된 메서드이다. */
// userSchema.methods.matchPassword = async function (
//   plainPassword: string,
//   hashedPassword: string
// ): Promise<boolean> {
//   return await bcryptjs.compare(plainPassword, hashedPassword);
// };

// userSchema.methods.isPasswordUpdatedAfterJwtIssued = function (
//   jwtTimestamp: number
// ): boolean {
//   if (this.passwordUpdatedAt) {
//     const timestamp = parseInt(this.passwordUpdatedAt.getTime(), 10) / 1000;

//     return jwtTimestamp < timestamp;
//   }

//   return false;
// };

// userSchema.methods.createPasswordResetToken = function (): string {
//   /*
//    * 비밀번호 재설정 토큰은 사용자에게 보내지는데 새 비밀번호를 생성할 수 있다.
//    * 비밀번호 재설정 토큰에 접근할 수 있는 사람은 사용자뿐이다. 그래서 실제로 비밀번호처럼 작동한다.
//    * 본질적으로 비밀번호와 같기 때문에 공격자가 데이터베이스에 접근할 경우 새 비밀번호를 설정하여 계정에 접근할 수 있다.
//    * 비밀번호 재설정 토큰을 데이터베이스에 그냥 저장한다면 공격자가 데이터베이스에 접근하고 비밀번호 재설정 토큰을 사용하여 새 비밀번호를 생성할 수 있다.
//    * 즉, 공격자가 계정을 제어한다. 따라서, 비밀번호와 마찬가지로 비밀번호 재설정 토큰을 평문으로 데이터베이스에 저장해서는 안 된다.
//    * 하지만 비밀번호와는 달리 매우 강력한 암호화 방법은 필요하지 않기에 내장 crypto 모듈을 사용한다.
//    */
//   const token = crypto.randomBytes(32).toString('hex');

//   this.passwordResetToken = crypto
//     .createHash('sha256')
//     .update(token)
//     .digest('hex');

//   this.passwordResetTokenExpiration = new Date(Date.now() + 10 * 60 * 1000);

//   /* 비밀번호처럼 암호문만 데이터베이스에 저장한다. */
//   return token;
// };

// const User = mongoose.model<UserDocument, UserModel>('User', userSchema);

// export { User, UserModel, UserDocument };
