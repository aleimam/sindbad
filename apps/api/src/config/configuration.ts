export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.API_PORT ?? '3001', 10),
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3002').split(
    ',',
  ),
  jwt: {
    // Dev fallbacks only — MUST be set in real environments.
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
    accessTtlSec: parseInt(process.env.JWT_ACCESS_TTL_SEC ?? '900', 10), // 15 min
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? 'http://localhost:9000',
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'sindbad',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'sindbad123',
    bucket: process.env.MINIO_BUCKET ?? 'sindbad',
  },
  // Email — any SMTP service (SES/Resend/Brevo/Mailgun/Postmark/self-hosted).
  // When smtp.host is empty the dev logger is used instead.
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for port 465
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'Sindbad <no-reply@sindbad.app>',
  },
  // SMS — Twilio (international). When sid/token are empty the dev logger is used.
  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID ?? '',
    token: process.env.TWILIO_AUTH_TOKEN ?? '',
    from: process.env.TWILIO_FROM ?? '', // a Twilio number or Messaging Service SID
  },
});
