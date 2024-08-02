import { BookingMadeEvent, CorePublisher, Subject } from '@whooatour/common';

export class BookingMadePublisher extends CorePublisher<BookingMadeEvent> {
  readonly subject = Subject.BookingMade;
}
