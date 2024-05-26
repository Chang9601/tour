import request from 'supertest';
import mongoose from 'mongoose';

import { AuthApplication } from '../src/app';
import { UserController } from '../src/controller/user.controller';
import { AuthController } from '../src/controller/auth.controller';

let authApplication: AuthApplication;
let user: any;
let admin: any;
let credentials: any;

describe('사용자 API 테스트', () => {
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

    admin = {
      name: '관리자',
      email: 'admin@naver.com',
      password: '12341234aA!',
      passwordConfirm: '12341234aA!',
      userRole: 'ADMIN',
    };

    credentials = {
      email: user.email,
      password: user.password,
    };
  });

  describe('회원가입', () => {
    it('성공해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);
    });

    it('이름이 너무 짧아 실패해야 한다.', async () => {
      user.name = '톨';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(400);
    });

    it('잘못된 이메일로 실패해야 한다.', async () => {
      user.email = 'tolstoynaver.com';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(400);
    });

    it('잘못된 비밀번호로 실패해야 한다.', async () => {
      user.password = user.passwordConfirm = '12341234';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(400);
    });

    it('비밀번호가 너무 짧아서 실패해야 한다.', async () => {
      user.password = user.passwordConfirm = '1234aA!';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(400);
    });

    it('비밀번호가 너무 길이서 실패해야 한다.', async () => {
      user.password = user.passwordConfirm = '554223212341234Aa!@#AD1@s';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(400);
    });

    it('비밀번호 불일치로 실패해야 한다.', async () => {
      user.password = '12341234aA!';
      user.passwordConfirm = '12341234aA@';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(400);
    });

    it('중복 이메일로 실패해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(409);
    });
  });

  describe('조회', () => {
    it('성공해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(admin)
        .expect(201);
      const createUserResponse = await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const id = createUserResponse.body.data.id;
      credentials.email = admin.email;
      credentials.password = admin.password;

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const getUserReponse = await request(authApplication.app)
        .get(`/api/v1/users/${id}`)
        .set('Cookie', cookies)
        .expect(200);

      expect(getUserReponse.body.data.email).toBe(user.email);
    });

    it('권한이 없어 실패해야 한다.', async () => {
      const createUserResponse = await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const id = createUserResponse.body.data.id;

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .get(`/api/v1/users/${id}`)
        .set('Cookie', cookies)
        .expect(403);
    });

    it('사용자가 존재하지 않아 실패해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(admin)
        .expect(201);
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      credentials.email = admin.email;
      credentials.password = admin.password;

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .get(`/api/v1/users/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', cookies)
        .expect(404);
    });
  });

  describe('목록 조회', () => {
    it('성공해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(admin)
        .expect(201);
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      credentials.email = admin.email;
      credentials.password = admin.password;

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const getUsersReponse = await request(authApplication.app)
        .get('/api/v1/users')
        .set('Cookie', cookies)
        .expect(200);

      expect(getUsersReponse.body.data.length).toBe(2);
    });

    it('권한이 없어 실패해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(admin)
        .expect(201);
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .get('/api/v1/users')
        .set('Cookie', cookies)
        .expect(403);
    });
  });

  describe('갱신', () => {
    it('성공해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const updateUserResponse = await request(authApplication.app)
        .patch('/api/v1/users')
        .set('Cookie', cookies)
        .send({
          name: '도스토예프스키',
          email: 'dostoevsky@naver.com',
        })
        .expect(200);

      expect(updateUserResponse.body.data.name).toBe('도스토예프스키');
      expect(updateUserResponse.body.data.email).toBe('dostoevsky@naver.com');
    });

    it('이름이 너무 짧아 실패해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .patch('/api/v1/users')
        .set('Cookie', cookies)
        .send({
          name: '도',
          email: 'dostoevsky@naver.com',
        })
        .expect(400);
    });

    it('잘못된 이메일로 실패해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .patch('/api/v1/users')
        .set('Cookie', cookies)
        .send({
          name: '도스토예프스키',
          email: 'dostoevskynaver.com',
        })
        .expect(400);
    });

    it('비밀번호를 갱신하려고 하여 실패해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const dto = {
        name: '도스토예프스키',
        email: 'dostoevsky@naver.com',
        password: '12341234Aa!@',
      };

      await request(authApplication.app)
        .patch('/api/v1/users')
        .set('Cookie', cookies)
        .send(dto)
        .expect(400);
    });
  });

  describe('비밀번호 갱신', () => {
    it('성공해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const password = {
        oldPassword: user.password,
        newPassword: '12341234Aa!@',
      };

      const updatePasswordResponse = await request(authApplication.app)
        .patch('/api/v1/users/update-password')
        .set('Cookie', cookies)
        .send(password)
        .expect(200);

      expect(updatePasswordResponse.body.data.password).not.toBe(user.password);
    });

    it('이전 비밀번호가 일치하지 않아 실패해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const password = {
        oldPassword: '123114141411313!#!',
        newPassword: '12341234Aa!@',
      };

      await request(authApplication.app)
        .patch('/api/v1/users/update-password')
        .set('Cookie', cookies)
        .send(password)
        .expect(400);
    });

    it('새 비밀번호가 이전 비밀번호와 일치하여 실패해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const password = {
        oldPassword: user.password,
        newPassword: user.password,
      };

      await request(authApplication.app)
        .patch('/api/v1/users/update-password')
        .set('Cookie', cookies)
        .send(password)
        .expect(400);
    });
  });

  describe('본인', () => {
    it('성공해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const getMeResponse = await request(authApplication.app)
        .get('/api/v1/users/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(getMeResponse.body.data.id).toBeDefined();
      expect(getMeResponse.body.data.email).toBe(user.email);
    });
  });

  describe('삭제', () => {
    it('성공해야 한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signInResponse = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const deleteUserResponse = await request(authApplication.app)
        .delete('/api/v1/users')
        .set('Cookie', cookies)
        .expect(200);

      expect(deleteUserResponse.body.metadata.code).toBe(204);
    });
  });
});
