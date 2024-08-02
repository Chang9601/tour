import { cleanEnv, port, str, num, host } from 'envalid';

export function validateEnv() {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),
    MONGO_URI: str(),

    COOKIE_ACCESS_EXPIRATION: num(),
    COOKIE_REFRESH_EXPIRATION: num(),

    JWT_ACCESS_SECRET: str(),
    JWT_REFRESH_SECRET: str(),

    IMAGE_DIRECTORY_PATH: str(),

    NODEMAILER_FROM: str(),
    NODEMAILER_HOST: host(),
    NODEMAILER_PORT: port(),
    NODEMAILER_USER: str(),
    NODEMAILER_PASS: str(),

    GOOGLE_OAUTH2_AUTHORIZATION_GRANT: str(),
    GOOGLE_OAUTH2_AUTHORIZATION_URI: str(),
    GOOGLE_OAUTH2_TOKEN_URI: str(),
    GOOGLE_OAUTH2_USER_INFO_URI: str(),
    GOOGLE_OAUTH2_SCOPE: str(),
    GOOGLE_OAUTH2_CLIENT_ID: str(),
    GOOGLE_OAUTH2_CLIENT_SECRET: str(),
    GOOGLE_OAUTH2_REDIRECT_URI: str(),

    NAVER_OAUTH2_AUTHORIZATION_URI: str(),
    NAVER_OAUTH2_TOKEN_URI: str(),
    NAVER_OAUTH2_USER_INFO_URI: str(),
    NAVER_OAUTH2_SCOPE: str(),
    NAVER_OAUTH2_CLIENT_ID: str(),
    NAVER_OAUTH2_CLIENT_SECRET: str(),
    NAVER_OAUTH2_REDIRECT_URI: str(),

    NATS_URL: str(),
    NATS_CLUSTER_ID: str(),
    NATS_CLIENT_ID: str(),
  });
}
