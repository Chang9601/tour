import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as nats from 'node-nats-streaming';

import {
  BookingStatus,
  CookieUtil,
  JwtPayload,
  JwtType,
  JwtUtil,
  natsInstance,
} from '@whooatour/common';
import { JwtBundle } from '@whooatour/common/dist/type/jwt-bundle.type';

declare global {
  var signIn: (userId?: mongoose.Types.ObjectId) => string;
}

export let userId: mongoose.Types.ObjectId;
let mongo: MongoMemoryServer;

beforeAll(async () => {
  const client = {
    publish: jest
      .fn()
      .mockImplementation(
        (subject: string, data: string, callback: () => void) => {
          callback();
        },
      ),
    on: jest
      .fn()
      .mockImplementation((eventName: string, listener: () => void) => {}),
    onMessage: jest
      .fn()
      .mockImplementation((data: any, messge: nats.Message) => {}),
    subscribe: jest
      .fn()
      .mockImplementation(
        (subject: string, qGroup: string, opts: nats.SubscriptionOptions) => {
          return {
            on: jest
              .fn()
              .mockImplementation(
                (
                  eventName: string,
                  listener: (message: nats.Message) => void,
                ) => {
                  const message = {
                    ack: jest.fn().mockImplementation(),
                    getData: jest.fn().mockReturnValue(
                      JSON.stringify({
                        id: new mongoose.Types.ObjectId(),
                        tour: {
                          price: 100000,
                        },
                        status: BookingStatus.Pending,
                        userId: new mongoose.Types.ObjectId(),
                        sequence: 0,
                      }),
                    ),
                  } as unknown as nats.Message;

                  listener(message);
                },
              ),
          };
        },
      ),
    subscriptionOptions: jest.fn().mockReturnThis(),
    setDeliverAllAvailable: jest.fn().mockReturnThis(),
    setManualAckMode: jest.fn().mockReturnThis(),
    setAckWait: jest.fn().mockReturnThis(),
    setDurableName: jest.fn().mockReturnValue(nats.Subscription),
  } as unknown as nats.Stan;

  jest.spyOn(natsInstance, 'client', 'get').mockReturnValue(client);
  jest.spyOn(natsInstance, 'connect').mockImplementation();

  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  process.env.NODE_ENV = 'test';
  process.env.PORT = 3000;
  process.env.MONGO_URI = uri;

  process.env.JWT_ACCESS_SECRET = 'tour-jwt-access';
  process.env.JWT_REFRESH_SECRET = 'tour-jwt-refresh';

  await mongoose.connect(uri, {});
});

afterEach(async () => {
  await mongoose.connection.db!.collection('bookings').deleteMany();
});

afterAll(async () => {
  const collections = await mongoose.connection.db!.collections();

  for (const collection of collections) {
    await collection.deleteMany({});
  }

  await mongo.stop();
  await mongoose.connection.close();
});

global.signIn = (userId?: mongoose.Types.ObjectId) => {
  const payload: JwtPayload = { id: userId || new mongoose.Types.ObjectId() };

  const jwt: JwtBundle = JwtUtil.issue(payload, 'user@naver.com');

  const cookie = CookieUtil.set(
    JwtType.AccessToken,
    jwt.accessToken,
    true,
    1 * 60 * 60,
    'Strict',
    '/',
    false,
  );

  return cookie;
};