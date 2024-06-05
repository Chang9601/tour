import { UserPayload } from '@whooatour/common';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      PORT: number;
      MONGO_URI: string;

      JWT_SECRET: string;
      JWT_EXPIRATION: string;

      NODEMAILER_HOST: string;
      NODEMAILER_PORT: number;
      NODEMAILER_USER: string;
      NODEMAILER_PASS: string;
    }
  }
}

export {};
