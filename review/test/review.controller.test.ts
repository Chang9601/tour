import request from 'supertest';
import mongoose from 'mongoose';
import crypto from 'crypto';

import { ReviewApplication } from '../src/app';
import { ReviewController } from '../src/controller/review.controller';

let reviewApplication: ReviewApplication;
let review: any;

// TODO: 테스트 시 역할 설정.
describe('리뷰 API 테스트', () => {
  beforeAll(async () => {
    reviewApplication = new ReviewApplication(
      [new ReviewController()],
      process.env.PORT,
      process.env.MONGO_URI
    );
  });

  beforeEach(async () => {
    review = {
      title: '광화문광장마켓에서 크리스마스!',
      content:
        '이 투어는 정말 훌륭했습니다! 가이드가 매우 친절하고 해박한 설명을 해주셔서 많은 것을 배울 수 있었습니다. 아름다운 경치와 완벽하게 짜여진 일정 덕분에 잊지 못할 경험을 했어요. 특히 사진 찍기 좋은 장소들을 많이 알게 되어 좋았고, 편안한 분위기에서 여행을 즐길 수 있었습니다. 다음에도 꼭 다시 참여하고 싶어요. 강력 추천합니다!',
      rating: 5,
    };
  });

  describe('생성', () => {
    it('성공해야 한다.', async () => {
      await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);
    });

    it('인증되지 않아서 실패해야 한다.', async () => {
      await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .send(review)
        .expect(401);
    });

    it('제목이 너무 짧아서 실패해야 한다.', async () => {
      review.title = '광화문광장';

      await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(400);
    });

    it('제목이 너무 길어서 실패해야 한다.', async () => {
      review.title = crypto.randomBytes(128).toString('hex');

      await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(400);
    });

    it('내용이 너무 짧아서 실패해야 한다.', async () => {
      review.content = '환상적인 투어!';

      await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(400);
    });

    it('내용이 너무 길아서 실패해야 한다.', async () => {
      review.content = crypto.randomBytes(2048).toString('hex');

      await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(400);
    });

    it('평점이 너무 낮아서 실패해야 한다.', async () => {
      review.rating = -1;

      await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(400);
    });

    it('평점이 너무 높아서 실패해야 한다.', async () => {
      review.rating = 10;

      await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(400);
    });
  });

  // describe('목록 조회', () => {
  //   it('성공해야 한다.', async () => {
  //     const cookie = global.signIn();

  //     await request(reviewApplication.app)
  //       .post('/api/v1/reviews')
  //       .set('Cookie', [cookie])
  //       .send(review)
  //       .expect(201);
  //     await request(reviewApplication.app)
  //       .post('/api/v1/reviews')
  //       .set('Cookie', [cookie])
  //       .send({
  //         name: '남산서울타워',
  //         duration: 4,
  //         groupSize: 10,
  //         difficulty: '중',
  //         price: 120000,
  //         discount: 90000,
  //         summary: '남산서울타워에서 멋진 전망을~',
  //         coverImage: '남산서울타워.img',
  //       })
  //       .expect(201);

  //     const response = await request(reviewApplication.app)
  //       .get(`/api/v1/reviews`)
  //       .expect(200);

  //     expect(response.body.data.length).toBe(2);
  //   });
  // });

  describe('조회', () => {
    it('성공해야 한다.', async () => {
      const createReviewResponse = await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);

      const id = createReviewResponse.body.data.id;

      const getReviewResponse = await request(reviewApplication.app)
        .get(`/api/v1/reviews/${id}`)
        .expect(200);

      expect(getReviewResponse.body.data.title).toBe(review.title);
    });

    it('잘못된 MongoDB 아이디로 실패해야 한다.', async () => {
      await request(reviewApplication.app).get(`/api/v1/reviews/1`).expect(400);
    });

    it('여행이 존재하지 않으므로 실패해야 한다.', async () => {
      await request(reviewApplication.app)
        .get(`/api/v1/reviews/${new mongoose.Types.ObjectId()}`)
        .expect(404);
    });
  });

  describe('수정', () => {
    it('성공해야 한다.', async () => {
      const cookie = global.signIn();

      const createReviewResponse = await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .set('Cookie', [cookie])
        .send(review)
        .expect(201);

      const id = createReviewResponse.body.data.id;

      const updateReviewResponse = await request(reviewApplication.app)
        .patch(`/api/v1/reviews/${id}`)
        .set('Cookie', [cookie])
        .send({ title: '남산서울타워에서 환상적인 경치!', rating: 4 })
        .expect(200);

      expect(updateReviewResponse.body.data.title).toBe(
        '남산서울타워에서 환상적인 경치!'
      );
      expect(updateReviewResponse.body.data.rating).toBe(4);
    });

    it('리뷰가 존재하지 않으므로 실패해야 한다.', async () => {
      await request(reviewApplication.app)
        .patch(`/api/v1/reviews/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', [global.signIn()])
        .send({ title: '남산서울타워에서 환상적인 경치!', rating: 4 })
        .expect(404);
    });

    it('인증되지 않아서 실패해야 한다.', async () => {
      const createReviewResponse = await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);

      const id = createReviewResponse.body.data.id;

      await request(reviewApplication.app)
        .patch(`/api/v1/reviews/${id}`)
        .send({ title: '남산서울타워에서 환상적인 경치!', rating: 4 })
        .expect(401);
    });

    it('작성자가 아니기에 실패해야 한다.', async () => {
      const createReviewResponse = await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);

      const id = createReviewResponse.body.data.id;

      await request(reviewApplication.app)
        .patch(`/api/v1/reviews/${id}`)
        .send({ title: '남산서울타워에서 환상적인 경치!', rating: 4 })
        .set('Cookie', [global.signIn()])
        .expect(403);
    });
  });

  describe('삭제', () => {
    it('성공해야 한다.', async () => {
      const cookie = global.signIn();

      const createReviewResponse = await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .set('Cookie', [cookie])
        .send(review)
        .expect(201);

      const id = createReviewResponse.body.data.id;

      const deleteReviewResponse = await request(reviewApplication.app)
        .delete(`/api/v1/reviews/${id}`)
        .set('Cookie', [cookie])
        .expect(200);

      expect(deleteReviewResponse.body.metadata.code).toBe(204);
    });

    it('여행이 존재하지 않으므로 실패해야 한다.', async () => {
      await request(reviewApplication.app)
        .patch(`/api/v1/reviews/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', [global.signIn()])
        .expect(404);
    });

    it('인증되지 않아서 실패해야 한다.', async () => {
      const createReviewResponse = await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);
      const id = createReviewResponse.body.data.id;

      await request(reviewApplication.app)
        .delete(`/api/v1/reviews/${id}`)
        .expect(401);
    });

    it('작성자가 아니기에 실패해야 한다.', async () => {
      const createReviewResponse = await request(reviewApplication.app)
        .post(`/api/v1/tours/${new mongoose.Types.ObjectId()}/reviews`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);

      const id = createReviewResponse.body.data.id;

      await request(reviewApplication.app)
        .delete(`/api/v1/reviews/${id}`)
        .set('Cookie', [global.signIn()])
        .expect(403);
    });
  });
});
