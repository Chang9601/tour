import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import * as nats from 'node-nats-streaming';

import {
  CookieUtil,
  JwtPayload,
  JwtType,
  JwtUtil,
  natsInstance,
} from '@whooatour/common';
import { JwtBundle } from '@whooatour/common/dist/type/jwt-bundle.type';

declare global {
  var signIn: () => string;
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
                        difficulty: '하',
                        duration: 2,
                        groupSize: 2,
                        name: '서울숲',
                        price: 100000,
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

  process.env.COOKIE_ACCESS_EXPIRATION = 1;
  process.env.COOKIE_REFRESH_EXPIRATION = 30;

  process.env.JWT_ACCESS_SECRET = 'tour-jwt-access';
  process.env.JWT_REFRESH_SECRET = 'tour-jwt-refresh';

  process.env.EXPIRATION_WINDOW = 900;

  await mongoose.connect(uri, {});
});

afterEach(async () => {
  await mongoose.connection.db.collection('bookings').deleteMany();
});

afterAll(async () => {
  const collections = await mongoose.connection.db.collections();

  for (const collection of collections) {
    await collection.deleteMany({});
  }

  await mongo.stop();
  await mongoose.connection.close();
});

global.signIn = () => {
  userId = new mongoose.Types.ObjectId();

  const payload: JwtPayload = { id: userId };

  const jwt: JwtBundle = JwtUtil.issue(payload);

  const cookie = CookieUtil.set(
    JwtType.AccessToken,
    jwt.accessToken,
    true,
    process.env.COOKIE_ACCESS_EXPIRATION * 60 * 60,
    'Strict',
    '/',
    false,
  );

  return cookie;
};
