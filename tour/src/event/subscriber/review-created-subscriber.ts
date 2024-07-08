import { Message } from 'node-nats-streaming';

import { CoreSubscriber, ReviewCreatedEvent, Subject } from '@whooatour/common';

export class ReviewCreatedSubscriber extends CoreSubscriber<ReviewCreatedEvent> {
  readonly subject = Subject.ReviewCreated;
  queueGroup = 'review-service';

  onMessage(data: ReviewCreatedEvent['data'], message: Message): void {
    console.log('이벤트 데이터!', data);
    console.log(data.id);
    console.log(data.rating);
    console.log(data.tourId);

    message.ack();
  }
}
