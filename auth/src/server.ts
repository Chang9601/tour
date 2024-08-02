import * as dotenv from 'dotenv';

process.on('uncaughtException', (error: Error) => {
  console.log('처리하지 오류로 인해 프로세스가 종료됩니다.');
  console.log(error);

  process.exit(1);
});

dotenv.config({
  path: '.env',
});

import { AuthApplication } from './app';
import { AuthController } from './controller/auth.controller';
import { OAuth2Controller } from './controller/oauth2.controller';
import { UserController } from './controller/user.controller';
import { validateEnv } from './util/env-validator';

validateEnv();

const authApplication = new AuthApplication(
  [new AuthController(), new OAuth2Controller(), new UserController()],
  process.env.PORT,
  process.env.MONGO_URI,
);

const server = authApplication.listen();

process.on('unhandledRejection', (error: Error) => {
  console.log('처리하지 프로미스 거부로 인해 프로세스가 종료됩니다.');
  console.log(error);

  server.close(() => {
    process.exit(1);
  });
});
