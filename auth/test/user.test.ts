import mongoose from 'mongoose';
import request from 'supertest';

import { UserRole } from '@whooatour/common';

import { AuthApplication } from '../src/app';
import { UserController } from '../src/controller/user.controller';
import { AuthController } from '../src/controller/auth.controller';

let authApplication: AuthApplication;
let user: any;
let admin: any;
let credentials: any;

describe('인증 모듈 API 테스트', () => {
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

    admin = {
      email: 'admin@naver.com',
      name: '관리자',
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
    it('성공한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);
    });

    it('이름이 짧아 실패한다.', async () => {
      user.name = '사';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(400);
    });

    it('유효하지 않은 이메일로 실패한다.', async () => {
      user.email = 'user1naver.com';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(400);
    });

    it('유효하지 않은 비밀번호로 실패한다.', async () => {
      user.password = user.passwordConfirm = '12341234';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(400);
    });

    it('비밀번호가 짧아서 실패한다.', async () => {
      user.password = user.passwordConfirm = '1234aA!';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(400);
    });

    it('비밀번호가 길어 실패한다.', async () => {
      user.password = user.passwordConfirm = '554223212341234Aa!@#AD1@s';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(400);
    });

    it('비밀번호 불일치로 실패한다.', async () => {
      user.password = '12341234aA!';
      user.passwordConfirm = '12341234aA@';

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(400);
    });

    it('중복 이메일로 실패한다.', async () => {
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

  describe('회원탈퇴', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const deleteMe = await request(authApplication.app)
        .delete('/api/v1/users')
        .set('Cookie', cookies)
        .expect(200);

      expect(deleteMe.body.metadata.code).toBe(204);
    });
  });

  describe('회원조회', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const getMe = await request(authApplication.app)
        .get('/api/v1/users')
        .set('Cookie', cookies)
        .expect(200);

      expect(getMe.body.data.id).toBeDefined();
      expect(getMe.body.data.email).toBe(user.email);
    });
  });

  describe('회원수정', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const updateMe = await request(authApplication.app)
        .patch('/api/v1/users')
        .set('Cookie', cookies)
        .send({
          name: '사용자2',
          email: 'user2@naver.com',
        })
        .expect(200);

      expect(updateMe.body.data.name).toBe('사용자2');
      expect(updateMe.body.data.email).toBe('user2@naver.com');
    });

    it('이름이 짧아 실패한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .patch('/api/v1/users')
        .set('Cookie', cookies)
        .send({
          name: '사',
        })
        .expect(400);
    });

    it('유효하지 않은 이메일로 실패한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .patch('/api/v1/users')
        .set('Cookie', cookies)
        .send({
          email: 'user2naver.com',
        })
        .expect(400);
    });

    it('비밀번호를 수정하려고 하여 실패한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .patch('/api/v1/users')
        .set('Cookie', cookies)
        .send({
          name: 'user2',
          email: '사용자2@naver.com',
          password: '12341234Aa!@',
        })
        .expect(400);
    });
  });

  describe('비밀번호 수정', () => {
    it('성공한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const password = {
        oldPassword: user.password,
        newPassword: '12341234Aa!@',
      };

      const updateMyPassword = await request(authApplication.app)
        .patch('/api/v1/users/update-password')
        .set('Cookie', cookies)
        .send(password)
        .expect(200);

      expect(updateMyPassword.body.data.password).not.toBe(user.password);
    });

    it('이전 비밀번호가 일치하지 않아 실패한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

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

    it('새 비밀번호가 이전 비밀번호와 일치하여 실패한다.', async () => {
      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

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

  // /* 관리자 API */
  describe('사용자 삭제 (관리자)', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.Admin;

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(admin)
        .expect(201);

      const createMe = await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const id = createMe.body.data.id;

      credentials.email = admin.email;
      credentials.password = admin.password;

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const deleteUser = await request(authApplication.app)
        .delete(`/api/v1/admin/users/${id}`)
        .set('Cookie', cookies)
        .expect(200);

      expect(deleteUser.body.metadata.code).toBe(204);
    });

    it('사용자가 존재하지 않아 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.Admin;

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(admin)
        .expect(201);

      credentials.email = admin.email;
      credentials.password = admin.password;

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .delete(`/api/v1/admin/users/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', cookies)
        .expect(404);
    });

    it('권한이 없어 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(admin)
        .expect(201);

      const createMe = await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const id = createMe.body.data.id;

      credentials.email = admin.email;
      credentials.password = admin.password;

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .delete(`/api/v1/admin/users/${id}`)
        .set('Cookie', cookies)
        .expect(403);
    });
  });

  describe('사용자 목록 (관리자)', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.Admin;

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

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const getUsers = await request(authApplication.app)
        .get('/api/v1/admin/users')
        .set('Cookie', cookies)
        .expect(200);

      expect(getUsers.body.data.length).toBe(2);
    });

    it('권한이 없어 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(admin)
        .expect(201);

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .get('/api/v1/admin/users')
        .set('Cookie', cookies)
        .expect(403);
    });
  });

  describe('사용자 조회 (관리자)', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.Admin;

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(admin)
        .expect(201);

      const createMe = await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const id = createMe.body.data.id;

      credentials.email = admin.email;
      credentials.password = admin.password;

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const getUser = await request(authApplication.app)
        .get(`/api/v1/admin/users/${id}`)
        .set('Cookie', cookies)
        .expect(200);

      expect(getUser.body.data.email).toBe(user.email);
    });

    it('사용자가 존재하지 않아 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.Admin;

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

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .get(`/api/v1/admin/users/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', cookies)
        .expect(404);
    });

    it('권한이 없어 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const createUser = await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const id = createUser.body.data.id;

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .get(`/api/v1/admin/users/${id}`)
        .set('Cookie', cookies)
        .expect(403);
    });
  });

  describe('사용자 수정 (관리자)', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.Admin;

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(admin)
        .expect(201);

      const createMe = await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const id = createMe.body.data.id;

      credentials.email = admin.email;
      credentials.password = admin.password;

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const updateUser = await request(authApplication.app)
        .patch(`/api/v1/admin/users/${id}`)
        .set('Cookie', cookies)
        .send({
          name: '사용자2',
          email: 'user2@naver.com',
          password: '12341234Aa!@',
        })
        .expect(200);

      expect(updateUser.body.data.name).toBe('사용자2');
      expect(updateUser.body.data.email).toBe('user2@naver.com');
    });

    it('이름이 짧아 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.Admin;

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(admin)
        .expect(201);

      const createMe = await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const id = createMe.body.data.id;

      credentials.email = admin.email;
      credentials.password = admin.password;

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .patch(`/api/v1/admin/users/${id}`)
        .set('Cookie', cookies)
        .send({
          name: '사',
        })
        .expect(400);
    });

    it('유효하지 않은 이메일로 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.Admin;

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(admin)
        .expect(201);

      const createMe = await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const id = createMe.body.data.id;

      credentials.email = admin.email;
      credentials.password = admin.password;

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .patch(`/api/v1/admin/users/${id}`)
        .set('Cookie', cookies)
        .send({
          email: 'user2naver.com',
        })
        .expect(400);
    });

    it('사용자가 존재하지 않아 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.Admin;

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(admin)
        .expect(201);

      credentials.email = admin.email;
      credentials.password = admin.password;

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .patch(`/api/v1/admin/users/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', cookies)
        .send({
          name: '사용자2',
          email: 'user2@naver.com',
          password: '12341234Aa!@',
        })
        .expect(404);
    });

    it('권한이 없어 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(authApplication.app)
        .post('/api/v1/users')
        .send(admin)
        .expect(201);

      const createMe = await request(authApplication.app)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const id = createMe.body.data.id;

      credentials.email = admin.email;
      credentials.password = admin.password;

      const signIn = await request(authApplication.app)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signIn.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(authApplication.app)
        .patch(`/api/v1/admin/users/${id}`)
        .set('Cookie', cookies)
        .send({
          name: '사용자2',
          email: 'user2@naver.com',
          password: '12341234Aa!@',
        })
        .expect(403);
    });
  });
});
