declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string;
      PORT: number;
      MONGO_URI: string;

      COOKIE_ACCESS_EXPIRATION: number;
      COOKIE_REFRESH_EXPIRATION: number;

      JWT_ACCESS_SECRET: string;
      JWT_REFRESH_SECRET: string;

      NATS_URL: string;
      NATS_CLUSTER_ID: string;
      NATS_CLIENT_ID: string;
    }
  }
}

export {};
