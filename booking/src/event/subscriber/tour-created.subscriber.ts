import { Message } from 'node-nats-streaming';

import { CoreSubscriber, Subject, TourCreatedEvent } from '@whooatour/common';

import { queueGroup } from '../queue-group';
import { Tour } from '../../model/tour.model';

export class TourCreatedSubscriber extends CoreSubscriber<TourCreatedEvent> {
  readonly subject = Subject.TourCreated;
  queueGroup = queueGroup;

  async onMessage(
    data: TourCreatedEvent['data'],
    message: Message,
  ): Promise<void> {
    try {
      const { id, difficulty, duration, groupSize, name, price } = data;

      await Tour.create({
        _id: id,
        difficulty,
        duration,
        groupSize,
        name,
        price,
      });

      message.ack();
    } catch (error) {
      console.error(error);
    }
  }
}
