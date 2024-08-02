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

      NODEMAILER_FROM: string;
      NODEMAILER_HOST: string;
      NODEMAILER_PORT: number;
      NODEMAILER_USER: string;
      NODEMAILER_PASS: string;

      GOOGLE_OAUTH2_AUTHORIZATION_GRANT: string;
      GOOGLE_OAUTH2_AUTHORIZATION_URI: string;
      GOOGLE_OAUTH2_TOKEN_URI: string;
      GOOGLE_OAUTH2_USER_INFO_URI: string;
      GOOGLE_OAUTH2_SCOPE: string;
      GOOGLE_OAUTH2_CLIENT_ID: string;
      GOOGLE_OAUTH2_CLIENT_SECRET: string;
      GOOGLE_OAUTH2_REDIRECT_URI: string;

      NAVER_OAUTH2_AUTHORIZATION_GRANT: string;
      NAVER_OAUTH2_AUTHORIZATION_URI: string;
      NAVER_OAUTH2_TOKEN_URI: string;
      NAVER_OAUTH2_USER_INFO_URI: string;
      NAVER_OAUTH2_SCOPE: string;
      NAVER_OAUTH2_CLIENT_ID: string;
      NAVER_OAUTH2_CLIENT_SECRET: string;
      NAVER_OAUTH2_REDIRECT_URI: string;

      NATS_URL: string;
      NATS_CLUSTER_ID: string;
      NATS_CLIENT_ID: string;
    }
  }
}

export {};
