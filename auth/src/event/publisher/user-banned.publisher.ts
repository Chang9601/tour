import { CorePublisher, Subject, UserBannedEvent } from '@whooatour/common';

export class UserBannedPublisher extends CorePublisher<UserBannedEvent> {
  readonly subject = Subject.UserBanned;
}
