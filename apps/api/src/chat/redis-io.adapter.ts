import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

/**
 * Socket.IO adapter backed by Redis pub/sub, so chat broadcasts fan out across
 * every API instance. Applied at server creation (the correct place — a
 * per-namespace `afterInit` cannot set the root adapter), and only when a Redis
 * URL is configured. Presence tracking stays per-node (fine for one box).
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger('RedisIoAdapter');
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(url: string): Promise<void> {
    const pub = new Redis(url, { maxRetriesPerRequest: null });
    const sub = pub.duplicate();
    pub.on('error', (e) => this.logger.warn(`Redis pub error: ${e.message}`));
    sub.on('error', (e) => this.logger.warn(`Redis sub error: ${e.message}`));
    this.adapterConstructor = createAdapter(pub, sub);
    this.logger.log('Chat Redis adapter connected — cross-instance broadcasting enabled.');
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}
