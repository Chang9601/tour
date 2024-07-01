import request from 'supertest';

import { App } from '../src/app';
import { UserController } from '../src/controller/user.controller';
import { AuthController } from '../src/controller/auth.controller';

let app: App;
let user: any;
let admin: any;
let credentials: any;

describe('사용자 API 테스트', () => {
  beforeAll(async () => {
    app = new App(
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
      photo: 'me.jpg',
      userRole: 'ADMIN',
    };

    credentials = {
      email: user.email,
      password: user.password,
    };
  });

  describe('회원가입', () => {
    it('회원가입에 성공해야 한다.', async () => {
      await request(app.express).post('/api/v1/users').send(user).expect(201);
    });

    it('이메일이 없어 회원가입에 실패해야 한다.', async () => {
      delete user.email;

      await request(app.express).post('/api/v1/users').send(user).expect(400);
    });

    it('비밀번호가 없어 회원가입에 실패해야 한다.', async () => {
      delete user.password;
      delete user.passwordConfirm;

      await request(app.express).post('/api/v1/users').send(user).expect(400);
    });

    it('잘못된 이메일로 회원가입에 실패해야 한다.', async () => {
      user.email = 'tolstoynaver.com';

      await request(app.express).post('/api/v1/users').send(user).expect(400);
    });

    it('잘못된 비밀번호로 회원가입에 실패해야 한다.', async () => {
      user.password = user.passwordConfirm = '12341234';

      await request(app.express).post('/api/v1/users').send(user).expect(400);
    });

    it('비밀번호 불일치로 회원가입에 실패해야 한다.', async () => {
      user.password = '12341234aA!';
      user.passwordConfirm = '12341234aA@';

      await request(app.express).post('/api/v1/users').send(user).expect(400);
    });

    it('중복 이메일로 회원가입에 실패해야 한다.', async () => {
      await request(app.express).post('/api/v1/users').send(user).expect(201);
      await request(app.express).post('/api/v1/users').send(user).expect(409);
    });
  });

  describe('조회', () => {
    it('사용자를 조회하는데 성공해야 한다.', async () => {
      await request(app.express).post('/api/v1/users').send(admin).expect(201);
      const createUserResponse = await request(app.express)
        .post('/api/v1/users')
        .send(user)
        .expect(201);

      const id = createUserResponse.body.data.id;
      credentials.email = admin.email;
      credentials.password = admin.password;

      const signInResponse = await request(app.express)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const getUserReponse = await request(app.express)
        .get(`/api/v1/users/${id}`)
        .set('Cookie', cookies)
        .expect(200);

      expect(getUserReponse.body.data.email).toBe(user.email);
    });

    it('사용자가 존재하지 않아 실패해야 한다.', async () => {
      await request(app.express).post('/api/v1/users').send(admin).expect(201);
      await request(app.express).post('/api/v1/users').send(user).expect(201);

      credentials.email = admin.email;
      credentials.password = admin.password;

      const signInResponse = await request(app.express)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      await request(app.express)
        .get('/api/v1/users/667e932f5b38fe507562ea8c')
        .set('Cookie', cookies)
        .expect(404);
    });
  });

  describe('갱신', () => {
    it('사용자 정보(비밀번호 제외)를 갱신하는데 성공해야 한다.', async () => {
      await request(app.express).post('/api/v1/users').send(user).expect(201);

      const signInResponse = await request(app.express)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const dto = {
        name: '도스토예프스키',
        email: 'dostoevsky@naver.com',
      };

      const updateUserResponse = await request(app.express)
        .patch('/api/v1/users')
        .set('Cookie', cookies)
        .send(dto)
        .expect(200);

      expect(updateUserResponse.body.data.name).toBe(dto.name);
      expect(updateUserResponse.body.data.email).toBe(dto.email);
    });

    it('비밀번호를 갱신하려고 하여 실패해야 한다.', async () => {
      await request(app.express).post('/api/v1/users').send(user).expect(201);

      const signInResponse = await request(app.express)
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

      await request(app.express)
        .patch('/api/v1/users')
        .set('Cookie', cookies)
        .send(dto)
        .expect(400);
    });
  });

  describe('비밀번호 갱신', () => {
    it('사용자 비밀번호를 갱신하는데 성공해야 한다.', async () => {
      await request(app.express).post('/api/v1/users').send(user).expect(201);

      const signInResponse = await request(app.express)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const password = {
        oldPassword: user.password,
        newPassword: '12341234Aa!@',
      };

      const updatePasswordResponse = await request(app.express)
        .patch('/api/v1/users/update-password')
        .set('Cookie', cookies)
        .send(password)
        .expect(200);

      expect(updatePasswordResponse.body.data.password).not.toBe(user.password);
    });

    it('이전 비밀번호가 일치하지 않아 갱신에 실패해야 한다.', async () => {
      await request(app.express).post('/api/v1/users').send(user).expect(201);

      const signInResponse = await request(app.express)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const password = {
        oldPassword: '123114141411313!#!',
        newPassword: '12341234Aa!@',
      };

      await request(app.express)
        .patch('/api/v1/users/update-password')
        .set('Cookie', cookies)
        .send(password)
        .expect(400);
    });

    it('새 비밀번호가 이전 비밀번호와 일치하여 갱신에 실패해야 한다.', async () => {
      await request(app.express).post('/api/v1/users').send(user).expect(201);

      const signInResponse = await request(app.express)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const password = {
        oldPassword: user.password,
        newPassword: user.password,
      };

      await request(app.express)
        .patch('/api/v1/users/update-password')
        .set('Cookie', cookies)
        .send(password)
        .expect(400);
    });
  });

  describe('본인', () => {
    it('사용자 본인을 조회해야 한다.', async () => {
      await request(app.express).post('/api/v1/users').send(user).expect(201);

      const signInResponse = await request(app.express)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const meResponse = await request(app.express)
        .get('/api/v1/users/me')
        .set('Cookie', cookies)
        .expect(200);

      expect(meResponse.body.data.id).toBeDefined();
      expect(meResponse.body.data.email).toBe(user.email);
    });
  });

  describe('삭제', () => {
    it('사용자를 삭제해야 한다.', async () => {
      await request(app.express).post('/api/v1/users').send(user).expect(201);

      const signInResponse = await request(app.express)
        .post('/api/v1/auth/sign-in')
        .send(credentials)
        .expect(200);

      const cookies = signInResponse.get('Set-Cookie')!;

      expect(cookies).toBeDefined();

      const deleteResponse = await request(app.express)
        .delete('/api/v1/users')
        .set('Cookie', cookies)
        .expect(200);

      expect(deleteResponse.body.metadata.code).toBe(204);
    });
  });
});
