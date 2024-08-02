import { cleanEnv, num, port, str } from 'envalid';

export function validateEnv() {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),
    MONGO_URI: str(),

    JWT_ACCESS_SECRET: str(),
    JWT_REFRESH_SECRET: str(),

    EXPIRATION_WINDOW: num(),
  });
}
