import { CorePublisher, PaymentMadeEvent, Subject } from '@whooatour/common';

export class PaymentMadePublisher extends CorePublisher<PaymentMadeEvent> {
  readonly subject = Subject.PaymentMade;
}
