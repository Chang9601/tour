import { Message } from 'node-nats-streaming';

import {
  Code,
  CoreSubscriber,
  Nullable,
  ReviewDeletedEvent,
  Subject,
} from '@whooatour/common';

import { ReviewNotFoundError } from '../../error/review-not-found.error';
import { TourNotFoundError } from '../../error/tour-not-found.error';
import { queueGroup } from '../../event/queue-group';
import { Review, ReviewDocument } from '../../model/review.model';
import { Tour, TourDocument } from '../../model/tour.model';

export class ReviewDeletedSubscriber extends CoreSubscriber<ReviewDeletedEvent> {
  readonly subject = Subject.ReviewDeleted;
  queueGroup = queueGroup;

  async onMessage(
    data: ReviewDeletedEvent['data'],
    message: Message,
  ): Promise<void> {
    try {
      const { id, sequence, ratingsAverage, ratingsCount } = data;

      const tour: Nullable<TourDocument> = await Tour.findOne({
        _id: data.tour.id,
      });

      if (!tour) {
        throw new TourNotFoundError(
          Code.NOT_FOUND,
          '아이디에 해당하는 여행이 존재하지 않습니다.',
        );
      }

      const review: Nullable<ReviewDocument> = await Review.findOneAndDelete({
        _id: id,
        sequence: sequence - 1,
      });

      if (!review) {
        throw new ReviewNotFoundError(
          Code.NOT_FOUND,
          '아이디에 해당하는 리뷰가 존재하지 않습니다.',
        );
      }

      tour.set({
        ratingsAverage,
        ratingsCount,
      });

      await tour.save({ validateModifiedOnly: true });

      message.ack();
    } catch (error) {
      console.error(error);
    }
  }
}
