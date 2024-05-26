import request from 'supertest';

import { AuthApplication } from '../src/app';
import { UserController } from '../src/controller/user.controller';
import { AuthController } from '../src/controller/auth.controller';

let authApplication: AuthApplication;
let user: any;
let credentials: any;

describe('인증 API 테스트', () => {
  beforeAll(async () => {
    authApplication = new AuthApplication(
      [new UserController(), new AuthController()],
      process.env.PORT,
      process.env.MONGO_URI,
    );
  });

  beforeEach(async () => {
    user = {
      name: '톨스토이',
      email: 'tolstoy@naver.com',
      password: '12341234aA!',
      passwordConfirm: '12341234aA!',
      photo: 'me.jpg',
      userRole: 'USER',
    };

    credentials = {
      email: user.email,
      password: user.password,
    };
  });

  describe('로그인', () => {
    it('성공해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const response = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = response.get('Set-Cookie');

      expect(cookies).toBeDefined();
    });

    it('잘못된 이메일로 실패해야 한다.', async () => {
      credentials.email = 'camus@naver.com';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);
      await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(400);
    });

    it('잘못된 비밀번호로 실패해야 한다.', async () => {
      credentials.password = '12341234';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);
      await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(400);
    });
  });

  describe('로그아웃', () => {
    it('성공해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      let cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const signOutResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-out')
        .set('Cookie', cookies)
        .expect(200);

      cookies = signOutResponse
        .get('Set-Cookie')!
        .map((cookie: string) => cookie.split(';')[0]);

      const accessToken = cookies
        .find((cookie: string) => cookie.includes('AccessToken'))
        ?.split('=')[1];
      const refreshToken = cookies
        .find((cookie: string) => cookie.includes('RefreshToken'))
        ?.split('=')[1];

      expect(accessToken).toBe('');
      expect(refreshToken).toBe('');
    });
  });
});
