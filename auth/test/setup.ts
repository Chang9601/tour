import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      PORT: number;
      MONGO_URI: string;

      COOKIE_ACCESS_EXPIRATION: number;
      COOKIE_REFRESH_EXPIRATION: number;

      JWT_ACCESS_SECRET: string;
      JWT_ACCESS_EXPIRATION: string;
      JWT_REFRESH_SECRET: string;
      JWT_REFRESH_EXPIRATION: string;
    }
  }
}

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  process.env.NODE_ENV = 'development';
  process.env.PORT = 3000;
  process.env.MONGO_URI = uri;

  process.env.COOKIE_ACCESS_EXPIRATION = 1;
  process.env.COOKIE_REFRESH_EXPIRATION = 30;

  process.env.JWT_ACCESS_SECRET = 'tour-jwt-access';
  process.env.JWT_ACCESS_EXPIRATION = '1h';
  process.env.JWT_REFRESH_SECRET = 'tour-jwt-refresh';
  process.env.JWT_REFRESH_EXPIRATION = '30d';

  await mongoose.connect(uri, {});
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();

  for (const collection of collections) {
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  await mongo.stop();
  await mongoose.connection.close();
});

// global.signIn = async () => {
//   const sign = await request(authApplication.app)
//     .post('/api/v1/auth/sign-in')
//     .send(credentials)
//     .expect(200);

//   const cookies = signInResponse.get('Set-Cookie')!;

//   expect(cookies).toBeDefined();
// };
