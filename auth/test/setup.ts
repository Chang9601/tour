import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();

  process.env.NODE_ENV = 'test';
  process.env.PORT = 3000;
  process.env.MONGO_URI = uri;

  process.env.JWT_ACCESS_SECRET = 'tour-jwt-access';
  process.env.JWT_REFRESH_SECRET = 'tour-jwt-refresh';

  process.env.IMAGE_DIRECTORY_PATH = 'public/image/users';

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
