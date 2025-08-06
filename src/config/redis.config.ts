export const RedisConfig = {
  host: process.env.REDIS_HOST ?? '45.114.85.18',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB ?? '0'),
  ttl: parseInt(process.env.REDIS_TTL ?? '300'), // 5 minutes default cache time
};
