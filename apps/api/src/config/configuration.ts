export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.API_PORT ?? '3001', 10),
  databaseUrl: process.env.DATABASE_URL ?? '',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3002').split(
    ',',
  ),
  jwt: {
    // Dev fallbacks only — MUST be set in real environments.
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
    accessTtlSec: parseInt(process.env.JWT_ACCESS_TTL_SEC ?? '900', 10), // 15 min
  },
});
