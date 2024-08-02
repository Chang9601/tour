import { Message } from 'node-nats-streaming';

import {
  Code,
  CoreSubscriber,
  Nullable,
  ReviewCreatedEvent,
  Subject,
} from '@whooatour/common';

import { TourNotFoundError } from '../../error/tour-not-found.error';
import { queueGroup } from '../../event/queue-group';
import { Review } from '../../model/review.model';
import { Tour, TourDocument } from '../../model/tour.model';

export class ReviewCreatedSubscriber extends CoreSubscriber<ReviewCreatedEvent> {
  readonly subject = Subject.ReviewCreated;
  queueGroup = queueGroup;

  // TODO: 트랜잭션
  async onMessage(
    data: ReviewCreatedEvent['data'],
    message: Message,
  ): Promise<void> {
    try {
      const { id, rating } = data;

      const tour: Nullable<TourDocument> = await Tour.findOne({
        _id: data.tour.id,
      });

      if (!tour) {
        throw new TourNotFoundError(
          Code.NOT_FOUND,
          '아이디에 해당하는 여행이 존재하지 않습니다.',
        );
      }

      /*
       * 서비스를 통해 데이터를 복제할 때 동일하거나 일관된 아이디를 사용해야 한다.
       * 아이디를 삽입하여 서로 다른 서비스 간에 고유한 도큐먼트를 식별할 수 있다.
       */
      await Review.create({
        _id: id,
        rating,
        tour,
      });

      const oldRatingSum = tour.ratingAverage * tour.ratingCount;
      const newRatingSum = oldRatingSum + rating;

      tour.ratingCount += 1;
      tour.ratingAverage = newRatingSum / tour.ratingCount;

      await tour.save({ validateModifiedOnly: true });

      message.ack();
    } catch (error) {
      console.error(error);
    }
  }
}
