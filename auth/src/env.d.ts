declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      PORT: number;
      MONGO_URI: string;

      REDIS_HOST: string;
      REDIS_PORT: number;

      JWT_ACCESS_SECRET: string;
      JWT_REFRESH_SECRET: string;

      IMAGE_DIRECTORY_PATH: string;

      NODEMAILER_FROM: string;
      NODEMAILER_HOST: string;
      NODEMAILER_PORT: number;
      NODEMAILER_USER: string;
      NODEMAILER_PASS: string;

      GOOGLE_OAUTH2_CLIENT_ID: string;
      GOOGLE_OAUTH2_CLIENT_SECRET: string;
      GOOGLE_OAUTH2_REDIRECT_URI: string;

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
