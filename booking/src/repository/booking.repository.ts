import { CoreRepository } from '@whooatour/common';

import { BookingDocument, BookingModel } from '../model/booking.model';

export class BookingRepository extends CoreRepository<BookingDocument> {
  constructor(public readonly tourModel: BookingModel) {
    super(tourModel);
  }
}
