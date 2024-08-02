import { CorePublisher, ReviewCreatedEvent, Subject } from '@whooatour/common';

export class ReviewCreatedPublisher extends CorePublisher<ReviewCreatedEvent> {
  readonly subject = Subject.ReviewCreated;
}
