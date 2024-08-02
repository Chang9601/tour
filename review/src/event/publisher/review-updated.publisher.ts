import {
  CorePublisher,
  ReviewCreatedEvent,
  ReviewUpdatedEvent,
  Subject,
} from '@whooatour/common';

export class ReviewUpdatedPublisher extends CorePublisher<ReviewUpdatedEvent> {
  readonly subject = Subject.ReviewUpdated;
}
