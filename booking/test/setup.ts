import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

import { CookieUtil, JwtPayload, JwtUtil } from '@whooatour/common';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      PORT: number;
      MONGO_URI: string;

      COOKIE_ACCESS_EXPIRATION: number;

      JWT_ACCESS_SECRET: string;
      JWT_ACCESS_EXPIRATION: string;
    }
  }

  var signIn: () => string;
}

//jest.mock('./mock/nats-instance');

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  process.env.NODE_ENV = 'test';
  process.env.PORT = 3000;
  process.env.MONGO_URI = uri;

  process.env.COOKIE_ACCESS_EXPIRATION = 1;

  process.env.JWT_ACCESS_SECRET = 'tour-jwt-access';
  process.env.JWT_ACCESS_EXPIRATION = '1h';

  await mongoose.connect(uri, {});
});

beforeEach(async () => {
  jest.clearAllMocks();

  const collections = await mongoose.connection.db.collections();

  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongo.stop();
  await mongoose.connection.close();
});

global.signIn = () => {
  const payload: JwtPayload = { id: new mongoose.Types.ObjectId() };

  const jwt = JwtUtil.issue(
    payload,
    process.env.JWT_ACCESS_SECRET,
    process.env.JWT_ACCESS_EXPIRATION
  );

  const cookie = CookieUtil.set(
    'AccessToken',
    jwt,
    true,
    process.env.COOKIE_ACCESS_EXPIRATION * 60 * 60,
    'Strict',
    '/',
    false
  );

  return cookie;
};
