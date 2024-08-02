import {
  CorePublisher,
  ExpirationCompletedEvent,
  Subject,
} from '@whooatour/common';

export class ExpirationCompletedPublisher extends CorePublisher<ExpirationCompletedEvent> {
  readonly subject = Subject.ExpirationCompleted;
}
