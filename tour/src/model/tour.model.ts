import mongoose from 'mongoose';
import { updateIfCurrentPlugin } from 'mongoose-update-if-current';

/*
 * 여행 인스턴스가 가지는 속성을 기술하는 인터페이스.
 * 여행 인스턴스를 생성할 때마다 TypeScript는 속성에 대해 알지 못한다.
 * 예를 들어, nae와 같이 속성에 오타가 있어도 Mongoose로부터 정보를 받지 못하기 때문에 TypeScript가 컴파일 오류를 내지 않는다.
 */
interface TourAttribute {
  name: string;
  duration: number;
  groupSize: number;
  difficulty: string;
  price: number;
  discount: number;
  summary: string;
  coverImage: string;
  locations: any; // TODO: 자료형 명시.
}

/*
 * 여행 도큐먼트가 가지는 속성을 기술하는 인터페이스.
 * 여행 도큐먼트가 여행 인스턴스를 생성할 때 전달하는 속성이 도큐먼트에 존재하는 속성과 다를 때 발생하는 문제를 해결한다.
 * 예를 들어, createdAt과 같은 속성을 여행 도큐먼트가 가질 수 있다.
 */
interface TourDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  coverImage: string;
  duration: number;
  difficulty: string;
  discount: number;
  groupSize: number;
  guides: [mongoose.Types.ObjectId];
  name: string;
  price: number;
  ratingCount: number;
  ratingAverage: number;
  sourceLocation: any;
  summary: string;
  bookingId?: mongoose.Types.ObjectId;
  sequence: number;
}

/*
 * 여행 모델이 가지는 속성을 기술하는 인터페이스.
 * TypeScript에게 여행 모델에서 사용 가능한 build() 메서드가 있을 것이라고 알려준다.
 * JavaScript와 달리 해당 인터페이스가 없으면 오류가 발생한다.
 */
interface TourModel extends mongoose.Model<TourDocument> {
  build(attrs: TourAttribute): Promise<TourDocument>;
}

/* 스키마는 데이터의 구조, 기본값 및 유효성을 설명하여 데이터를 모델화한다. */
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
    slug: String,
    duration: {
      type: Number,
      required: [true, ' 기간이 있어야 합니다.'],
      min: [1, '기간은 1일 이상입니다.'],
      max: [365, '기간은 365일 이하입니다.'],
    },
    groupSize: {
      type: Number,
      required: [true, ' 여행객의 인원이 있어야 합니다.'],
      min: [1, '그룹은 1명 이상입니다.'],
      max: [100, '그룹은 100명 이하입니다.'],
    },
    difficulty: {
      type: String,
      required: [true, '난이도가 있어야 합니다.'],
      enum: {
        values: ['상', '중', '하'],
        message: '난이도는 상, 중, 하 중 하나입니다.',
      },
    },
    ratingAverage: {
      type: Number,
      default: 0,
      min: [0, '평점은 0 이상입니다.'],
      max: [5, '평점은 5 이하입니다.'],
      set: (value: number) =>
        Math.round(value * 10) / 10 /* 3.66666 => 36.666 => 37 => 3.7 */,
    },
    ratingCount: { type: Number, default: 0 },
    price: {
      type: Number,
      required: [true, '가격이 있어야 합니다.'],
      min: [100000, '가격은 100000원 이상입니다.'],
    },
    discount: {
      type: Number,
      validate: {
        message: '할인가({VALUE})는 정상가보다 작아야 합니다.',
        /*
         * this 예약어는 새로운 도큐먼트 생성 시에만 도큐먼트를 가리킨다. 따라서 갱신에는 작동하지 않는다.
         * 즉, save() 메서드와 create() 메서드에만 작동한다.
         *
         * TypeScript가 함수의 타입을 확인하려면 호출 시 this 예약어가 참조할 객체의 타입을 알아야 한다.
         * TypeScript는 validator 함수가 포함된 객체 리터럴의 메서드로 호출될 것이라고 잘못 추측한다.
         * Mongoose는 validator 함수를 정의하고 있는 구조의 도큐먼트로 this 예약어를 설정하여 호출한다.
         * 따라서, 도큐먼트 타입을 정의하고 validator 함수에 this 매개변수를 지정해야 한다.
         */
        validator: function (this: TourDocument, value: number) {
          return value < this.price;
        },
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, '요약문이 있어야 합니다.'],
    },
    bookingId: {
      type: mongoose.Schema.ObjectId,
    },
    description: {
      type: String,
      trim: true,
    },
    coverImage: {
      type: String,
      required: [true, '표지 이미지가 있어야 합니다.'],
    },
    image: [String],
    secret: {
      type: Boolean,
      default: false,
    },
    sourceLocation: {
      /*
       * GeoJSON은 지리 공간 데이터를 명시한다.
       * 스키마 타입 옵션을 위한 것이 아니라 내장 객체이다.
       * 각각의 하위 필드가 자신만의 스키마 유형 옵션을 가진다.
       */
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    //guides: Array,
    //    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    guides: [mongoose.Schema.ObjectId],
    startDate: [Date],
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
    /*
     * toJSON() 메서드의 반환 값은 JSON.stringify() 메서드 호출 시 사용된다.
     * toObject() 메서드와 동일한 옵션을 가지지만 toJSON() 메서드 옵션과 toObject() 메서드 옵션 사이에는 한 가지 차이점이 있다.
     * toJSON() 메서드 호출 시 JSON.stringify() 메서드가 기본적으로 Map을 객체로 변환하지 않기 때문에 flattenMaps 옵션이 기본적으로 true로 설정된다.
     * toObject() 메서드 호출 시 flattenMaps 옵션이 기본적으로 false로 설정된다.
     *
     * flattenMaps 옵셥은 JavaScript의 Map을 POJO로 변환할지 여부를 지정한다.
     * true로 설정하면 Map을 POJO로 변환한다. 즉, Map의 키와 값이 객체의 속성(key)과 속성 값(value)으로 변환된다.
     * false로 설정하면 Map이 그대로 유지된다.
     *
     * MVC 패턴 관점에서 보면 모델에서 뷰의 논리를 작성하는 것은 적합하지 않다.
     * 왜냐하면 뷰가 출력과 관련되어 있기 때문이다.
     */
    toJSON: {
      virtuals: true,
      versionKey: false,
      /*
       * 결과 객체를 변환해야 할 수도 있다. 예를 들어, 민감한 정보를 제거하거나 사용자 정의 객체를 반환해야 할 때가 있다.
       * 이 경우 선택적인 변환 함수를 설정한다.
       */
      transform(document, pojo) {
        delete pojo._id;
      },
    },
    /* 도큐먼트를 일반 JavaScript 객체(POJO)로 변환한다. */
    toObject: { virtuals: true, versionKey: false },
  },
);

//tourSchema.index({ price: 1 });
///tourSchema.index({ price: 1, ratingAverage: -1 });
//tourSchema.index({ sourceLocation: '2dsphere' });

/*
 * 가상 속성은 스키마에서 정의할 수 있는 필드이지만 데이터베이스에 저장되지 않는다.
 * 가상 속성은 서로 유도될 수 있는 필드에 대해 매우 유용한다.
 * 화살표 함수는 this 예약어를 가지지 않기 때문에 함수 선언식을 사용한다.
 */
tourSchema.virtual('durationWeek').get(function () {
  return this.duration! / 7;
});

/*
 * Mongoose는 4개의 미들웨어(도큐먼트, 쿼리, 집계, 모델)를 가진다.
 *
 * 도큐먼트 미들웨어는 도큐먼트 처리 전/후에 적용하는 미들웨어이다.
 * save() 메서드와 create() 메서드 호출 시만 적용된다(e.g., insertMany() 메서드의 경우 적용되지 않는다.).
 *
 * 쿼리 미들웨어는 쿼리 실행 전/후에 적용하는 미들웨어이다.
 *
 * 집계 미들웨어는 집계 실행 전/후에 적용하는 미들웨어이다.
 *
 * pre는 이벤트 이전에 발생하는 미들웨어이다. post는 이벤트 이후에 발생하는 미들웨어이다.
 */

// tourSchema.pre('save', function (next) {
//   const promises = this.guides.map((guide) => await User.findById(guide));
//   this.guides = await Promise.all(promises);

//   next();
// });

// tourSchema.pre('save', function (next) {
//   /* this 예약어는 도큐먼트를 가리킨다. */
//   this.slug = slugify(this.name!, { lower: true });

//   next();
// });

// tourSchema.pre('save', function (next) {
//   console.log('도큐먼트를 데이터베이스에 저장한다.');

//   next();
// });

// tourSchema.post('save', function (document, next) {
//   console.log(document);

//   next();
// });

tourSchema.pre(/^find/, function (next) {
  /* this 예약어는 쿼리를 가리킨다. */
  //this.find({ secret: { $ne: true } });

  //this.start = Date.now();

  next();
});

// tourSchema.post(/^find/, function (documents, next) {
//   //console.log(`쿼리 실행시간: ${Date.now() - this.start} 밀리초.`);

//   /* this 예약어는 쿼리를 가리킨다. */
//   console.log(documents);

//   next();
// });

// tourSchema.pre('aggregate', function (next) {
//   this.pipeline().unshift({ $match: { secret: { $ne: true } } });

//   /* this 예약어는 집계를 가리킨다. */
//   console.log(this.pipeline());

//   next();
// });

tourSchema.set('versionKey', 'sequence');
tourSchema.plugin(updateIfCurrentPlugin);

/* 맞춤 메서드를 모델에 추가한다. */
tourSchema.statics.build = async function (attrs: TourAttribute) {
  /* 모델에 메서드를 호출한다. */
  return await Tour.create(attrs);

  /* 도큐먼트에 메서드를 호출한다. */
  // return new Tour(attrs);
};

/* 모델은 스키마를 감싸는 포장(wrapper)으로 데이터베이스에 대한 CRUD 작업을 위한 인터페이스를 제공한다. */
const Tour = mongoose.model<TourDocument, TourModel>('Tour', tourSchema);

export { Tour, TourModel, TourDocument };
