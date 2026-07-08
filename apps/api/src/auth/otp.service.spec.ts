import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import { hashOtpCode, OtpService } from './otp.service';

/** Minimal in-memory stand-in for prisma.otpChallenge */
function makeFakePrisma() {
  const rows = new Map<string, Record<string, unknown>>();
  let seq = 0;
  const prisma = {
    otpChallenge: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const id = `ch_${++seq}`;
        const row = {
          id,
          attempts: 0,
          maxAttempts: 5,
          consumedAt: null,
          userId: null,
          ...data,
        };
        rows.set(id, row);
        return { ...row };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        const row = rows.get(where.id)!;
        for (const [k, v] of Object.entries(data)) {
          if (typeof v === 'object' && v !== null && 'increment' in (v as object)) {
            row[k] = (row[k] as number) + (v as { increment: number }).increment;
          } else {
            row[k] = v;
          }
        }
        return { ...row };
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const row = rows.get(where.id);
        return row ? { ...row } : null;
      },
    },
  };
  return { prisma: prisma as unknown as PrismaService, rows };
}

const fakeConfig = { get: () => 'test' } as unknown as ConfigService;

function makeService() {
  const { prisma, rows } = makeFakePrisma();
  const sent: string[] = [];
  const sms = { sendSms: async (_to: string, body: string) => void sent.push(body) };
  const email = { sendEmail: async () => undefined };
  const service = new OtpService(prisma, fakeConfig, sms, email);
  return { service, rows, sent };
}

describe('OtpService', () => {
  it('issues a 6-digit code and verifies it', async () => {
    const { service, sent } = makeService();
    const issued = await service.issue({
      destination: '+201200003375',
      channel: 'SMS',
      purpose: 'REGISTER',
    });
    expect(issued.devCode).toMatch(/^\d{6}$/);
    expect(sent[0]).toContain(issued.devCode);

    const result = await service.verify(issued.challengeId, issued.devCode!, 'REGISTER');
    expect(result).toEqual({ ok: true });
  });

  it('rejects a wrong code and counts the attempt', async () => {
    const { service, rows } = makeService();
    const issued = await service.issue({
      destination: '+201200003375',
      channel: 'SMS',
      purpose: 'REGISTER',
    });
    const bad = issued.devCode === '000000' ? '000001' : '000000';
    const result = await service.verify(issued.challengeId, bad, 'REGISTER');
    expect(result).toEqual({ ok: false, reason: 'mismatch' });
    expect(rows.get(issued.challengeId)!.attempts).toBe(1);
  });

  it('rejects a consumed challenge (single use)', async () => {
    const { service } = makeService();
    const issued = await service.issue({
      destination: 'a@b.co',
      channel: 'EMAIL',
      purpose: 'REGISTER',
    });
    await service.verify(issued.challengeId, issued.devCode!, 'REGISTER');
    const again = await service.verify(issued.challengeId, issued.devCode!, 'REGISTER');
    expect(again).toEqual({ ok: false, reason: 'consumed' });
  });

  it('rejects an expired challenge', async () => {
    const { service, rows } = makeService();
    const issued = await service.issue({
      destination: 'a@b.co',
      channel: 'EMAIL',
      purpose: 'REGISTER',
    });
    rows.get(issued.challengeId)!.expiresAt = new Date(Date.now() - 1000);
    const result = await service.verify(issued.challengeId, issued.devCode!, 'REGISTER');
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('locks after max attempts', async () => {
    const { service, rows } = makeService();
    const issued = await service.issue({
      destination: 'a@b.co',
      channel: 'EMAIL',
      purpose: 'REGISTER',
    });
    rows.get(issued.challengeId)!.attempts = 5;
    const result = await service.verify(issued.challengeId, issued.devCode!, 'REGISTER');
    expect(result).toEqual({ ok: false, reason: 'too_many_attempts' });
  });

  it('rejects a purpose mismatch', async () => {
    const { service } = makeService();
    const issued = await service.issue({
      destination: 'a@b.co',
      channel: 'EMAIL',
      purpose: 'REGISTER',
    });
    const result = await service.verify(issued.challengeId, issued.devCode!, 'PASSWORD_RESET');
    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('hash binds the code to the challenge id', () => {
    expect(hashOtpCode('a', '123456')).not.toBe(hashOtpCode('b', '123456'));
  });
});
