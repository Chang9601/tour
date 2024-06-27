import request from 'supertest';

import { App } from '../src/app';
import { UserController } from '../src/controller/user.controller';

let app: App;

describe('사용자 API 테스트', () => {
  beforeAll(async () => {
    app = new App(
      [new UserController()],
      process.env.PORT,
      process.env.MONGO_URI,
    );
  });

  describe('회원가입 API 테스트', () => {
    it('회원가입에 성공해야 한다.', async () => {
      return request(app.express)
        .post('/api/v1/users')
        .send({
          name: '이창섭',
          email: 'changsup96@naver.com',
          password: '12341234aA!',
          passwordConfirm: '12341234aA!',
          photo: 'me.jpg',
          userRole: 'USER',
        })
        .expect(201);
    });

    it('이메일이 없어 회원가입에 실패해야 한다.', async () => {
      return request(app.express)
        .post('/api/v1/users')
        .send({
          name: '이창섭',
          password: '12341234aA!',
          passwordConfirm: '12341234aA!',
          photo: 'me.jpg',
          userRole: 'USER',
        })
        .expect(400);
    });

    it('비밀번호가 없어 회원가입에 실패해야 한다.', async () => {
      return request(app.express)
        .post('/api/v1/users')
        .send({
          name: '이창섭',
          email: 'changsup96@naver.com',
          photo: 'me.jpg',
          userRole: 'USER',
        })
        .expect(400);
    });

    it('잘못된 이메일로 회원가입에 실패해야 한다.', async () => {
      return request(app.express)
        .post('/api/v1/users')
        .send({
          name: '이창섭',
          email: 'changsup96naver.com',
          password: '12341234aA!',
          passwordConfirm: '12341234aA!',
          photo: 'me.jpg',
          userRole: 'USER',
        })
        .expect(400);
    });

    it('잘못된 비밀번호로 회원가입에 실패해야 한다.', async () => {
      return request(app.express)
        .post('/api/v1/users')
        .send({
          name: '이창섭',
          email: 'changsup96@naver.com',
          password: '12341234',
          passwordConfirm: '12341234',
          photo: 'me.jpg',
          userRole: 'USER',
        })
        .expect(400);
    });

    it('비밀번호 불일치로 회원가입에 실패해야 한다.', async () => {
      return request(app.express)
        .post('/api/v1/users')
        .send({
          name: '이창섭',
          email: 'changsup96@naver.com',
          password: '12341234aA!',
          passwordConfirm: '12341234aA@',
          photo: 'me.jpg',
          userRole: 'USER',
        })
        .expect(400);
    });

    it('중복 이메일로 회원가입에 실패해야 한다.', async () => {
      await request(app.express)
        .post('/api/v1/users')
        .send({
          name: '이창섭',
          email: 'changsup96@naver.com',
          password: '12341234aA!',
          passwordConfirm: '12341234aA!',
          photo: 'me.jpg',
          userRole: 'USER',
        })
        .expect(201);

      await request(app.express)
        .post('/api/v1/users')
        .send({
          name: '이창섭',
          email: 'changsup96@naver.com',
          password: '12341234aA!',
          passwordConfirm: '12341234aA!',
          photo: 'me.jpg',
          userRole: 'USER',
        })
        .expect(409);
    });
  });
});
