import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { TokenService } from '../auth/token.service';
import { AccountsService } from '../accounts/accounts.service';

/**
 * Realtime push (docs/01 §5): clients act via REST; sockets deliver
 * message.new / message.updated / thread.read / thread.delivered.
 * Auth: `io(url, { auth: { token: <access JWT> } })`.
 * Single-node now; the Redis adapter joins when Redis is deployed.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);
  private readonly online = new Map<string, number>(); // accountId → connection count

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly tokens: TokenService,
    private readonly accounts: AccountsService,
  ) {}

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
