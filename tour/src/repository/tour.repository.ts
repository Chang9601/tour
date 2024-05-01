import { PipelineStage } from 'mongoose';

import { AbstractRepository } from '@whooatour/common';

import { TourDocument, TourModel } from '../model/tour.model';

export class TourRepository extends AbstractRepository<TourDocument> {
  constructor(public readonly tourModel: TourModel) {
    super(tourModel);
  }

  public async aggregate(pipeline: PipelineStage[]) {
    return await this.tourModel.aggregate(pipeline);
  }
}
