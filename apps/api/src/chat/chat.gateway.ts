import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { TokenService } from '../auth/token.service';
import { AccountsService } from '../accounts/accounts.service';

/**
 * Realtime push (docs/01 §5): clients act via REST; sockets deliver
 * message.new / message.updated / thread.read / thread.delivered.
 * Auth: `io(url, { auth: { token: <access JWT> } })`.
 *
 * When REDIS_URL is set, a Redis adapter fans broadcasts across every API
 * instance so message delivery scales horizontally. Presence (`online`) stays
 * per-node — correct for the single-box deployment; a Redis-backed presence set
 * would be the next step for a multi-node cluster.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true }, namespace: '/chat' })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);
  private readonly online = new Map<string, number>(); // accountId → connection count

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly tokens: TokenService,
    private readonly accounts: AccountsService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Server) {
    const url = this.config.get<string>('redisUrl');
    if (!url) {
      this.logger.log('Chat gateway running single-node (no REDIS_URL).');
      return;
    }
    try {
      const pub = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: null });
      const sub = pub.duplicate();
      pub.on('error', (e) => this.logger.warn(`Redis pub error: ${e.message}`));
      sub.on('error', (e) => this.logger.warn(`Redis sub error: ${e.message}`));
      server.adapter(createAdapter(pub, sub));
      this.logger.log('Chat gateway using Redis adapter (horizontal scale enabled).');
    } catch (err) {
      this.logger.warn(`Redis adapter init failed; staying single-node: ${(err as Error).message}`);
    }
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.headers.authorization?.startsWith('Bearer ')
          ? client.handshake.headers.authorization.slice(7)
          : undefined) ??
        this.tokenFromCookie(client.handshake.headers.cookie);
      if (!token) throw new Error('no token');
      const payload = this.tokens.verifyAccessToken(token);
      const accountId = await this.accounts.getActingAccountId(payload.sub);

      client.data.accountId = accountId;
      await client.join(`account:${accountId}`);
      this.online.set(accountId, (this.online.get(accountId) ?? 0) + 1);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const accountId = client.data?.accountId as string | undefined;
    if (!accountId) return;
    const next = (this.online.get(accountId) ?? 1) - 1;
    if (next <= 0) this.online.delete(accountId);
    else this.online.set(accountId, next);
  }

  /** Web clients authenticate the socket via the httpOnly access cookie. */
  private tokenFromCookie(cookie?: string): string | undefined {
    if (!cookie) return undefined;
    const match = cookie.split(';').find((c) => c.trim().startsWith('sb_access='));
    return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : undefined;
  }

  isOnline(accountId: string): boolean {
    return this.online.has(accountId);
  }

  emitToAccount(accountId: string, event: string, payload: unknown) {
    try {
      this.server?.to(`account:${accountId}`).emit(event, payload);
    } catch (err) {
      this.logger.warn(`emit failed: ${(err as Error).message}`);
    }
  }
}
