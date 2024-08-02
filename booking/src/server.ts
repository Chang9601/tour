import * as dotenv from 'dotenv';

process.on('uncaughtException', (error: Error) => {
  console.log('처리하지 오류로 인해 프로세스가 종료됩니다.');
  console.log(error);

  process.exit(1);
});

dotenv.config({
  path: '.env',
});

import { BookingApplication } from './app';
import { BookingController } from './controller/booking.controller';
import { validateEnv } from './util/env-validator';

validateEnv();

const bookingApplication = new BookingApplication(
  [new BookingController()],
  process.env.PORT,
  process.env.MONGO_URI,
);

const server = bookingApplication.listen();

process.on('unhandledRejection', (error: Error) => {
  console.log('처리하지 프로미스 거부로 인해 프로세스가 종료됩니다.');
  console.log(error);

  server.close(() => {
    process.exit(1);
  });
});
