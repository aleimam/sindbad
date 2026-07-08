import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';

/**
 * S3-compatible object storage. Points at self-hosted MinIO today; swapping to a
 * managed provider later is a config change only (docs/01 §3).
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client;
  private bucket: string;
  private available = false;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('minio.bucket') ?? 'sindbad';
    this.client = new S3Client({
      endpoint: this.config.get<string>('minio.endpoint') ?? 'http://localhost:9000',
      region: 'us-east-1', // MinIO ignores it, the SDK requires it
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('minio.accessKey') ?? 'sindbad',
        secretAccessKey: this.config.get<string>('minio.secretKey') ?? 'sindbad123',
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.available = true;
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.available = true;
        this.logger.log(`Created bucket "${this.bucket}"`);
      } catch (err) {
        // Boot without MinIO in early dev — uploads will 503 until it's up.
        this.logger.warn(`Object storage unavailable: ${(err as Error).message}`);
      }
    }
  }

  get isAvailable() {
    return this.available;
  }

  async put(key: string, body: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  async getStream(key: string): Promise<{ stream: Readable; contentType?: string } | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return { stream: res.Body as Readable, contentType: res.ContentType };
    } catch {
      return null;
    }
  }

  async delete(keys: string[]) {
    await Promise.allSettled(
      keys.map((Key) => this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key }))),
    );
  }
}
