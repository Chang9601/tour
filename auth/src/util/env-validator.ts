import { cleanEnv, port, str, num, host } from 'envalid';

export function validateEnv() {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),
    MONGO_URI: str(),

    REDIS_HOST: str(),
    REDIS_PORT: port(),

    JWT_ACCESS_SECRET: str(),
    JWT_REFRESH_SECRET: str(),

    IMAGE_DIRECTORY_PATH: str(),

    NODEMAILER_FROM: str(),
    NODEMAILER_HOST: host(),
    NODEMAILER_PORT: port(),
    NODEMAILER_USER: str(),
    NODEMAILER_PASS: str(),

    GOOGLE_OAUTH2_CLIENT_ID: str(),
    GOOGLE_OAUTH2_CLIENT_SECRET: str(),
    GOOGLE_OAUTH2_REDIRECT_URI: str(),

    NAVER_OAUTH2_CLIENT_ID: str(),
    NAVER_OAUTH2_CLIENT_SECRET: str(),
    NAVER_OAUTH2_REDIRECT_URI: str(),

    NATS_URL: str(),
    NATS_CLUSTER_ID: str(),
    NATS_CLIENT_ID: str(),
  });
}
