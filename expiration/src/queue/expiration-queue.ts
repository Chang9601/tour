import { natsInstance } from '@whooatour/common';
import Queue from 'bull';
import { ExpirationCompletedPublisher } from 'event/publisher/expiration-completed.publisher';
import mongoose from 'mongoose';

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
