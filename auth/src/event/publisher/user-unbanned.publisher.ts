import { CorePublisher, Subject, UserUnbannedEvent } from '@whooatour/common';

export class UserUnbannedPublisher extends CorePublisher<UserUnbannedEvent> {
  readonly subject = Subject.UserUnbanned;
}
