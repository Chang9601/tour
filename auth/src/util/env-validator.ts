import { cleanEnv, port, str, num, host } from 'envalid';

export function validateEnv() {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),
    MONGO_URI: str(),

    JWT_ACCESS_SECRET: str(),
    JWT_ACCESS_EXPIRATION: str(),
    JWT_REFRESH_SECRET: str(),
    JWT_REFRESH_EXPIRATION: str(),

    COOKIE_ACCESS_EXPIRATION: num(),
    COOKIE_REFRESH_EXPIRATION: num(),

    NODEMAILER_HOST: host(),
    NODEMAILER_PORT: port(),
    NODEMAILER_USER: str(),
    NODEMAILER_PASS: str(),
  });
}
