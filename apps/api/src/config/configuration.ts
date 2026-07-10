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
  // SMS — SMS Misr routes Egyptian (+20) numbers, Twilio the rest. When both are
  // set the router splits by country; otherwise whichever is configured sends all;
  // if neither, the dev logger is used.
  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID ?? '',
    token: process.env.TWILIO_AUTH_TOKEN ?? '',
    from: process.env.TWILIO_FROM ?? '', // a Twilio number or Messaging Service SID
  },
  smsMisr: {
    username: process.env.SMSMISR_USERNAME ?? '',
    password: process.env.SMSMISR_PASSWORD ?? '',
    sender: process.env.SMSMISR_SENDER ?? '', // NTRA-approved sender name
    environment: process.env.SMSMISR_ENVIRONMENT ?? '1', // 1 = live, 2 = test
  },
  // Payment gateways for CARD deposits. Each activates when its keys are set.
  // publicBaseUrl is where gateways redirect the user / POST webhooks back.
  payments: {
    publicApiUrl: process.env.NEXT_PUBLIC_API_URL ?? process.env.PUBLIC_API_URL ?? '',
    webUrl: process.env.PUBLIC_WEB_URL ?? 'https://sindbad.app',
    kashier: {
      merchantId: process.env.KASHIER_MERCHANT_ID ?? '',
      apiKey: process.env.KASHIER_API_KEY ?? '', // payment API key (used for the HPP hash + webhook HMAC)
      mode: process.env.KASHIER_MODE ?? 'live', // 'live' | 'test'
    },
    opay: {
      merchantId: process.env.OPAY_MERCHANT_ID ?? '',
      publicKey: process.env.OPAY_PUBLIC_KEY ?? '',
      secretKey: process.env.OPAY_SECRET_KEY ?? '', // used to sign requests + verify webhooks
      baseUrl: process.env.OPAY_BASE_URL ?? 'https://api.opaycheckout.com',
    },
  },
});
