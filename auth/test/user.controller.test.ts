import request from 'supertest';

import { App } from '../src/app';
import { UserController } from '../src/controller/user.controller';
import { AuthController } from '../src/controller/auth.controller';

let app: App;
let user: any;
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
      name: '이창섭',
      email: 'changsup96@naver.com',
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
      user.email = 'changsup96naver.com';

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
