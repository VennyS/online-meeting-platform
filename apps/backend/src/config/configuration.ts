export const configuration = () => ({
  port: Number(process.env.PORT) || 3001,
  origin: process.env.ORIGIN || 'http://localhost:3000',
  proxy: {
    route: process.env.PROXY_ROUTE || 'http://localhost:8080/auth/check',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'changeme',
  },
  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY || 'devkey',
    apiSecret: process.env.LIVEKIT_API_SECRET || 'devsecret',
    url: process.env.LIVEKIT_URL || 'http://localhost:7880',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/mydb',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
});

export type AppConfig = ReturnType<typeof configuration>;
