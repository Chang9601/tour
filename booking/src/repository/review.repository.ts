import { CoreRepository } from '@whooatour/common';

import { ReviewDocument, ReviewModel } from '../model/booking.model';

export class ReviewRepository extends CoreRepository<ReviewDocument> {
  constructor(public readonly tourModel: ReviewModel) {
    super(tourModel);
  }
}
