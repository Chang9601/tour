import { cleanEnv, num, port, str } from 'envalid';

export function validateEnv() {
  cleanEnv(process.env, {
    NODE_ENV: str(),
    PORT: port(),
    MONGO_URI: str(),

    REDIS_HOST: str(),
    REDIS_PORT: port(),

    STRIPE_SECRET_KEY: str(),

    NATS_URL: str(),
    NATS_CLUSTER_ID: str(),
    NATS_CLIENT_ID: str(),
  });
}
