//import request from 'supertest';

import { App } from '../src/app';
import { UserController } from '../src/controller/user.controller';
import { AuthController } from '../src/controller/auth.controller';
import { describe } from 'node:test';

let app: App;

describe('인증 API 테스트', () => {
  beforeAll(async () => {
    app = new App(
      [new UserController(), new AuthController()],
      process.env.PORT,
      process.env.MONGO_URI,
    );
  });
});
