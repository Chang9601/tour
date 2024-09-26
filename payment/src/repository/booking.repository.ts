import { CoreRepository } from '@whooatour/common';

import { PaymentDocument, PaymentModel } from '../model/payment.model';

export class PaymentRepository extends CoreRepository<PaymentDocument> {
  constructor(public readonly tourModel: PaymentModel) {
    super(tourModel);
  }
}
