import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// declare global {
//   namespace NodeJS {
//     interface ProcessEnv {
//       NODE_ENV: string;
//       PORT: number;
//       MONGO_URI: string;

//       COOKIE_ACCESS_EXPIRATION: number;
//       COOKIE_REFRESH_EXPIRATION: number;

//       JWT_ACCESS_SECRET: string;
//       JWT_REFRESH_SECRET: string;
//       JWT_ACCESS_EXPIRATION: string;
//       JWT_REFRESH_EXPIRATION: string;

//       NODEMAILER_HOST: string;
//       NODEMAILER_PORT: number;
//       NODEMAILER_USER: string;
//       NODEMAILER_PASS: string;
//     }
//   }
// }

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  process.env.PORT = 3000;
  process.env.MONGO_URI = uri;

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
