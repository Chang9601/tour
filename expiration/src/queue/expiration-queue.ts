import Queue from 'bull';
import mongoose from 'mongoose';

import { natsInstance } from '@whooatour/common';

import { ExpirationCompletedPublisher } from '../event/publisher/expiration-completed.publisher';

type BookingPayload = {
  bookingId: mongoose.Types.ObjectId;
};

export const expirationQueue = new Queue<BookingPayload>('booking:expiration', {
  redis: {
    host: process.env.REDIS_HOST,
  },
});

expirationQueue.process(async (job) => {
  new ExpirationCompletedPublisher(natsInstance.client).publish({
    bookingId: job.data.bookingId,
  });
});
