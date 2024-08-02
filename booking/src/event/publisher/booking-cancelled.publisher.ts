import {
  BookingCancelledEvent,
  CorePublisher,
  Subject,
} from '@whooatour/common';

export class BookingCancelledPublisher extends CorePublisher<BookingCancelledEvent> {
  readonly subject = Subject.BookingCancelled;
}
