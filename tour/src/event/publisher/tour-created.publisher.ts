import { CorePublisher, Subject, TourCreatedEvent } from '@whooatour/common';

export class TourCreatedPublisher extends CorePublisher<TourCreatedEvent> {
  readonly subject = Subject.TourCreated;
}
