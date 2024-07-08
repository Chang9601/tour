import { cleanEnv, port, str, num } from 'envalid';

export function validateEnv() {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),
    MONGO_URI: str(),

    COOKIE_ACCESS_EXPIRATION: num(),
    COOKIE_REFRESH_EXPIRATION: num(),

    JWT_ACCESS_SECRET: str(),
    JWT_ACCESS_EXPIRATION: str(),
    JWT_REFRESH_SECRET: str(),
    JWT_REFRESH_EXPIRATION: str(),

    IMAGE_DIRECTORY_PATH: str(),
  });
}
