import request from 'supertest';

import { JwtType, UserRole } from '@whooatour/common';

import { AuthApplication } from '../src/app';
import { AuthController } from '../src/controller/auth.controller';
import { UserController } from '../src/controller/user.controller';

let authApplication: AuthApplication;
let user: any;
let credentials: any;

describe('인증 API 테스트', () => {
  beforeAll(async () => {
    authApplication = new AuthApplication([
      new UserController(),
      new AuthController(),
    ]);
  });

  beforeEach(async () => {
    user = {
      email: 'user1@naver.com',
      name: '사용자1',
      password: '12341234aA!',
      passwordConfirm: '12341234aA!',
      photo: 'none.jpg',
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

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie');

      expect(cookies).toBeDefined();
    });

    it('잘못된 이메일로 실패해야 한다.', async () => {
      credentials.email = 'user2@naver.com';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(404);
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
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      let cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const signOut = await request(authApplication.app)
        .post('/api/v1/auth/sign-out')
        .set('Cookie', cookies)
        .expect(200);

      cookies = signOut
        .get('Set-Cookie')!
        .map((cookie: string) => cookie.split(';')[0]);

      const accessToken = cookies
        .find((cookie: string) => cookie.includes(JwtType.AccessToken))
        ?.split('=')[1];

      const refreshToken = cookies
        .find((cookie: string) => cookie.includes(JwtType.RefreshToken))
        ?.split('=')[1];

      expect(accessToken).toBe('');
      expect(refreshToken).toBe('');
    });
  });
});
