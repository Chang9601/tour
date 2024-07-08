import request from 'supertest';
import mongoose from 'mongoose';

import { TourApplication } from '../src/app';
import { TourController } from '../src/controller/tour.controller';

let tourApplication: TourApplication;
let tour: any;

// TODO: 테스트 시 역할 설정.
describe('여행 API 테스트', () => {
  beforeAll(async () => {
    tourApplication = new TourApplication(
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

  describe('생성', () => {
    it('성공해야 한다.', async () => {
      await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [global.signIn()])
        .send(tour)
        .expect(201);
    });

    it('인증되지 않아서 실패해야 한다.', async () => {
      await request(tourApplication.app)
        .post('/api/v1/tours')
        .send(tour)
        .expect(401);
    });

    it('존재하지 않는 난이도라서 실패해야 한다.', async () => {
      tour.difficulty = '나';

      await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [global.signIn()])
        .send(tour)
        .expect(400);
    });

    it('할인가가 정상가보다 커서 실패해야 한다.', async () => {
      tour.discount = 150000;

      await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [global.signIn()])
        .send(tour)
        .expect(400);
    });

    it('요약문이 없어 실패해야 한다.', async () => {
      delete tour.summary;

      await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [global.signIn()])
        .send(tour)
        .expect(400);
    });

    it('표지 이미지가 없어 실패해야 한다.', async () => {
      delete tour.coverImage;

      await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [global.signIn()])
        .send(tour)
        .expect(400);
    });
  });

  describe('목록 조회', () => {
    it('성공해야 한다.', async () => {
      const cookie = global.signIn();

      await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [cookie])
        .send(tour)
        .expect(201);
      await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [cookie])
        .send({
          name: '남산서울타워',
          duration: 4,
          groupSize: 10,
          difficulty: '중',
          price: 120000,
          discount: 90000,
          summary: '남산서울타워에서 멋진 전망을~',
          coverImage: '남산서울타워.img',
        })
        .expect(201);

      const response = await request(tourApplication.app)
        .get(`/api/v1/tours`)
        .expect(200);

      expect(response.body.data.length).toBe(2);
    });
  });

  describe('조회', () => {
    it('성공해야 한다.', async () => {
      const createTourResponse = await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [global.signIn()])
        .send(tour)
        .expect(201);
      const id = createTourResponse.body.data.id;

      const getTourResponse = await request(tourApplication.app)
        .get(`/api/v1/tours/${id}`)
        .expect(200);

      expect(getTourResponse.body.data.name).toBe(tour.name);
    });

    it('잘못된 MongoDB 아이디로 실패해야 한다.', async () => {
      await request(tourApplication.app).get(`/api/v1/tours/1`).expect(400);
    });

    it('여행이 존재하지 않으므로 실패해야 한다.', async () => {
      await request(tourApplication.app)
        .get(`/api/v1/tours/${new mongoose.Types.ObjectId()}`)
        .expect(404);
    });
  });

  describe('수정', () => {
    it('성공해야 한다.', async () => {
      const cookie = global.signIn();

      const createTourResponse = await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [cookie])
        .send(tour)
        .expect(201);
      const id = createTourResponse.body.data.id;

      const updateTourResponse = await request(tourApplication.app)
        .patch(`/api/v1/tours/${id}`)
        .set('Cookie', [cookie])
        .send({ price: 150000, summary: '서울숲에서 사슴보기' })
        .expect(200);

      expect(updateTourResponse.body.data.price).toBe(150000);
      expect(updateTourResponse.body.data.summary).toBe('서울숲에서 사슴보기');
    });

    it('여행이 존재하지 않으므로 실패해야 한다.', async () => {
      await request(tourApplication.app)
        .patch(`/api/v1/tours/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', [global.signIn()])
        .send({ price: 150000, summary: '서울숲에서 사슴보기' })
        .expect(404);
    });

    it('인증되지 않아서 실패해야 한다.', async () => {
      const createTourResponse = await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [global.signIn()])
        .send(tour)
        .expect(201);
      const id = createTourResponse.body.data.id;

      await request(tourApplication.app)
        .patch(`/api/v1/tours/${id}`)
        .send({ price: 150000, summary: '서울숲에서 사슴보기' })
        .expect(401);
    });

    it('존재하지 않는 난이도라서 실패해야 한다.', async () => {
      const cookie = global.signIn();

      const createTourResponse = await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [cookie])
        .send(tour)
        .expect(201);
      const id = createTourResponse.body.data.id;

      await request(tourApplication.app)
        .patch(`/api/v1/tours/${id}`)
        .set('Cookie', [cookie])
        .send({ difficulty: '나' })
        .expect(400);
    });

    it('할인가가 정상가보다 커서 실패해야 한다.', async () => {
      const cookie = global.signIn();

      const createTourResponse = await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [cookie])
        .send(tour)
        .expect(201);
      const id = createTourResponse.body.data.id;

      await request(tourApplication.app)
        .patch(`/api/v1/tours/${id}`)
        .set('Cookie', [cookie])
        .send({ price: 120000, discount: 130000 })
        .expect(400);
    });

    it('요약문이 없어 실패해야 한다.', async () => {
      delete tour.summary;

      await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [global.signIn()])
        .send(tour)
        .expect(400);
    });

    it('표지 이미지가 없어 실패해야 한다.', async () => {
      delete tour.coverImage;

      await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [global.signIn()])
        .send(tour)
        .expect(400);
    });
  });

  describe('삭제', () => {
    it('성공해야 한다.', async () => {
      const cookie = global.signIn();

      const createTourResponse = await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [cookie])
        .send(tour)
        .expect(201);
      const id = createTourResponse.body.data.id;

      const deleteTourResponse = await request(tourApplication.app)
        .delete(`/api/v1/tours/${id}`)
        .set('Cookie', [cookie])
        .expect(200);

      expect(deleteTourResponse.body.metadata.code).toBe(204);
    });

    it('여행이 존재하지 않으므로 실패해야 한다.', async () => {
      await request(tourApplication.app)
        .patch(`/api/v1/tours/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', [global.signIn()])
        .expect(404);
    });

    it('인증되지 않아서 실패해야 한다.', async () => {
      const createTourResponse = await request(tourApplication.app)
        .post('/api/v1/tours')
        .set('Cookie', [global.signIn()])
        .send(tour)
        .expect(201);
      const id = createTourResponse.body.data.id;

      await request(tourApplication.app)
        .delete(`/api/v1/tours/${id}`)
        .expect(401);
    });
  });
});
