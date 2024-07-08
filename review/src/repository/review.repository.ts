import { CoreRepository } from '@whooatour/common';

import { ReviewDocument, ReviewModel } from '../model/review.model';

export class ReviewRepository extends CoreRepository<ReviewDocument> {
  constructor(public readonly tourModel: ReviewModel) {
    super(tourModel);
  }
}
