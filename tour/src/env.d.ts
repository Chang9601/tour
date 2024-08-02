/*
 * declare global는 TypeScript에서 전역 범위를 확장한다.
 * namespace NodeJS는 전역 범위 내에서 NodeJS 관련 유형에 대한 이름 공간을 정의한다.
 * interface ProcessEnv는 process.env를 통해 접근 가능한 환경 변수의 구조를 나타내는 ProcessEnv라는 인터페이스를 정의한다.
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      PORT: number;
      MONGO_URI: string;

      COOKIE_ACCESS_EXPIRATION: number;
      COOKIE_REFRESH_EXPIRATION: number;

      JWT_ACCESS_SECRET: string;
      JWT_REFRESH_SECRET: string;

      IMAGE_DIRECTORY_PATH: string;

      NATS_URL: string;
      NATS_CLUSTER_ID: string;
      NATS_CLIENT_ID: string;
    }
  }
}

/*
 * export는 빈 객체를 내보내는데 이는 파일에 import 또는 export 문이 포함되어 있을 때 TypeScript가 해당 파일을 모듈로 취급하도록 하는 데 필요하다.
 * 파일에는 유형 선언 이외의 가져오기 또는 내보내기 문이 없지만 전역 타입 확장이 전역적으로 적용되도록하려면 여전히 모듈로 처리해야 한다.
 */
export {};
