import { CorePublisher, ReviewDeletedEvent, Subject } from '@whooatour/common';

export class ReviewDeletedPublisher extends CorePublisher<ReviewDeletedEvent> {
  readonly subject = Subject.ReviewDeleted;
}
