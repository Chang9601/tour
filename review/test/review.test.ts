import crypto from 'crypto';

import mongoose from 'mongoose';
import request from 'supertest';

import { UserRole } from '@whooatour/common';

import { ReviewApplication } from '../src/app';
import { ReviewController } from '../src/controller/review.controller';
import { ReviewDocument } from '../src/model/review.model';

let reviewApplication: ReviewApplication;
let review: Partial<ReviewDocument>;
let tour: any;

describe('리뷰 API 테스트', () => {
  beforeAll(async () => {
    reviewApplication = new ReviewApplication([new ReviewController()]);

    await mongoose.connection.db.createCollection('tours');
    tour = await mongoose.connection.db.collection('tours').insertOne({
      name: '서울숲',
      duration: 2,
      groupSize: 2,
      difficulty: '하',
      price: 100000,
      discount: 80000,
      summary: '서울숲에서 휴식을~',
      coverImage: '서울숲.img',
    });
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
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);
    });

    it('제목이 짧아서 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      review.title = '광화문광장';

      await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(400);
    });

    it('제목이 길어서 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      review.title = crypto.randomBytes(128).toString('hex');

      await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(400);
    });

    it('내용이 짧아서 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      review.content = '환상적인 투어!';

      await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(400);
    });

    it('내용이 길아서 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      review.content = crypto.randomBytes(2048).toString('hex');

      await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(400);
    });

    it('평점이 낮아서 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      review.rating = -1;

      await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(400);
    });

    it('평점이 높아서 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      review.rating = 10;

      await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(400);
    });

    it('인증되지 않아 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .send(review)
        .expect(401);
    });
  });

  describe('조회', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const createMyReview = await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);

      const id = createMyReview.body.data.id;

      const getReview = await request(reviewApplication.app)
        .get(`/api/v1/reviews/${id}`)
        .expect(200);

      expect(getReview.body.data.title).toBe(review.title);
    });

    it('잘못된 MongoDB 아이디로 실패한다.', async () => {
      await request(reviewApplication.app).get(`/api/v1/reviews/1`).expect(400);
    });

    it('여행이 존재하지 않으므로 실패한다.', async () => {
      await request(reviewApplication.app)
        .get(`/api/v1/reviews/${new mongoose.Types.ObjectId()}`)
        .expect(404);
    });
  });

  describe('목록', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);

      await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send({
          title: '남산서울타워에서 멋진 전망을!',
          content:
            '이 투어는 정말 훌륭했습니다! 가이드가 매우 친절하고 해박한 설명을 해주셔서 많은 것을 배울 수 있었습니다. 아름다운 경치와 완벽하게 짜여진 일정 덕분에 잊지 못할 경험을 했어요. 특히 사진 찍기 좋은 장소들을 많이 알게 되어 좋았고, 편안한 분위기에서 여행을 즐길 수 있었습니다. 다음에도 꼭 다시 참여하고 싶어요. 강력 추천합니다!',
          rating: 5,
        })
        .expect(201);

      const getReviews = await request(reviewApplication.app)
        .get(`/api/v1/reviews`)
        .expect(200);

      expect(getReviews.body.data.length).toBe(2);
    });
  });

  describe('수정', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const cookie = global.signIn();

      const createMyReview = await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [cookie])
        .send(review)
        .expect(201);

      const id = createMyReview.body.data.id;

      const updateMyReview = await request(reviewApplication.app)
        .patch(`/api/v1/reviews/${id}`)
        .set('Cookie', [cookie])
        .send({ title: '남산서울타워에서 환상적인 경치!', rating: 4 })
        .expect(200);

      expect(updateMyReview.body.data.title).toBe(
        '남산서울타워에서 환상적인 경치!',
      );
      expect(updateMyReview.body.data.rating).toBe(4);
    });

    it('리뷰가 존재하지 않으므로 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      await request(reviewApplication.app)
        .patch(`/api/v1/reviews/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', [global.signIn()])
        .send({ title: '남산서울타워에서 환상적인 경치!', rating: 4 })
        .expect(404);
    });

    it('인증되지 않아 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const createMyReview = await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);

      const id = createMyReview.body.data.id;

      await request(reviewApplication.app)
        .patch(`/api/v1/reviews/${id}`)
        .send({ title: '남산서울타워에서 환상적인 경치!', rating: 4 })
        .expect(401);
    });

    it('작성자가 아니기에 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const createMyReview = await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);

      const id = createMyReview.body.data.id;

      await request(reviewApplication.app)
        .patch(`/api/v1/reviews/${id}`)
        .send({ title: '남산서울타워에서 환상적인 경치!', rating: 4 })
        .set('Cookie', [global.signIn()])
        .expect(403);
    });
  });

  describe('삭제', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const cookie = global.signIn();

      const createMyReview = await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [cookie])
        .send(review)
        .expect(201);

      const id = createMyReview.body.data.id;

      const deleteMyReview = await request(reviewApplication.app)
        .delete(`/api/v1/reviews/${id}`)
        .set('Cookie', [cookie])
        .expect(200);

      expect(deleteMyReview.body.metadata.code).toBe(204);
    });

    it('여행이 존재하지 않으므로 실패한다.', async () => {
      await request(reviewApplication.app)
        .patch(`/api/v1/reviews/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', [global.signIn()])
        .expect(404);
    });

    it('인증되지 않아 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const createMyReview = await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);

      const id = createMyReview.body.data.id;

      await request(reviewApplication.app)
        .delete(`/api/v1/reviews/${id}`)
        .expect(401);
    });

    it('작성자가 아니기에 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const createMyReview = await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);

      const id = createMyReview.body.data.id;

      await request(reviewApplication.app)
        .delete(`/api/v1/reviews/${id}`)
        .set('Cookie', [global.signIn()])
        .expect(403);
    });
  });

  /* 관리자 API */
  describe('수정 (관리자)', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.Admin;

      const cookie = global.signIn();

      const createMyReview = await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [cookie])
        .send(review)
        .expect(201);

      const id = createMyReview.body.data.id;

      const updateReview = await request(reviewApplication.app)
        .patch(`/api/v1/admin/reviews/${id}`)
        .set('Cookie', [cookie])
        .send({ title: '남산서울타워에서 환상적인 경치!', rating: 4 })
        .expect(200);

      expect(updateReview.body.data.title).toBe(
        '남산서울타워에서 환상적인 경치!',
      );
      expect(updateReview.body.data.rating).toBe(4);
    });

    it('리뷰가 존재하지 않으므로 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.Admin;

      await request(reviewApplication.app)
        .patch(`/api/v1/admin/reviews/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', [global.signIn()])
        .send({ title: '남산서울타워에서 환상적인 경치!', rating: 4 })
        .expect(404);
    });

    it('권한이 없어 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const createMyReview = await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);

      const id = createMyReview.body.data.id;

      await request(reviewApplication.app)
        .patch(`/api/v1/admin/reviews/${id}`)
        .send({ title: '남산서울타워에서 환상적인 경치!', rating: 4 })
        .expect(401);
    });
  });

  describe('삭제 (관리자)', () => {
    it('성공한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const cookie = global.signIn();

      const createMyReview = await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [cookie])
        .send(review)
        .expect(201);

      const id = createMyReview.body.data.id;

      process.env.TEST_USER_ROLE = UserRole.Admin;

      const deleteMyReview = await request(reviewApplication.app)
        .delete(`/api/v1/reviews/${id}`)
        .set('Cookie', [cookie])
        .expect(200);

      expect(deleteMyReview.body.metadata.code).toBe(204);
    });

    it('여행이 존재하지 않으므로 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.Admin;

      await request(reviewApplication.app)
        .patch(`/api/v1/admin/reviews/${new mongoose.Types.ObjectId()}`)
        .set('Cookie', [global.signIn()])
        .expect(404);
    });

    it('권한이 없어 실패한다.', async () => {
      process.env.TEST_USER_ROLE = UserRole.User;

      const createMyReview = await request(reviewApplication.app)
        .post(`/api/v1/reviews/tours/${tour.insertedId}`)
        .set('Cookie', [global.signIn()])
        .send(review)
        .expect(201);

      const id = createMyReview.body.data.id;

      await request(reviewApplication.app)
        .delete(`/api/v1/admin/reviews/${id}`)
        .expect(401);
    });
  });
});
