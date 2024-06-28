import request from 'supertest';

import { App } from '../src/app';
import { TourController } from '../src/controller/tour.controller';

let app: App;
let tour: any;

describe('여행 API 테스트', () => {
  beforeAll(async () => {
    app = new App(
      [new TourController()],
      process.env.PORT,
      process.env.MONGO_URI,
    );
  });

  beforeEach(async () => {
    tour = {
      name: '서울숲',
      duration: 2,
      groupSize: 2,
      difficulty: '하',
      price: 100000,
      discount: 80000,
      summary: '서울숲에서 휴식을~',
      coverImage: '서울숲.img',
    };
  });

  describe('조회', () => {
    it('여행을 조회하는데 성공해야 한다.', async () => {
      const createResponse = await request(app.express)
        .post('/api/v1/tours')
        .send(tour)
        .expect(201);
      const id = createResponse.body.data.id;

      const getResponse = await request(app.express)
        .get(`/api/v1/tours/${id}`)
        .expect(200);

      expect(getResponse.body.data.name).toBe(tour.name);
    });

    it('잘못된 MongoDB 아이디로 조회에 실패해야 한다.', async () => {
      await request(app.express).get(`/api/v1/tours/1`).expect(400);
    });

    it('여행이 존재하지 않으므로 조회에 실패해야 한다.', async () => {
      await request(app.express)
        .get(`/api/v1/tours/667e932f5b38fe507562ea8c`)
        .expect(404);
    });
  });
});
