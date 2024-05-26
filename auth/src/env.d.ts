declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      PORT: number;
      MONGO_URI: string;

      COOKIE_ACCESS_EXPIRATION: number;
      COOKIE_REFRESH_EXPIRATION: number;

      JWT_ACCESS_SECRET: string;
      JWT_ACCESS_EXPIRATION: string;
      JWT_REFRESH_SECRET: string;
      JWT_REFRESH_EXPIRATION: string;

      NODEMAILER_HOST: string;
      NODEMAILER_PORT: number;
      NODEMAILER_USER: string;
      NODEMAILER_PASS: string;
    }
  }
}

export {};
