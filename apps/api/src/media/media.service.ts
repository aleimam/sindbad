import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import sharp from 'sharp';
import type { AttachmentContext } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

export type Variant = 'original' | 'md' | 'thumb';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const PRIVATE_CONTEXTS: AttachmentContext[] = ['TRIP_VERIFICATION', 'KYC'];

export function keyFor(id: string, variant: Variant) {
  return `attachments/${id}/${variant}`;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Validate ownership of the subject, compress (spec: "all uploaded photos should
   * be compressed"), store original + md + thumb, create the Attachment row.
   */
  async upload(
    actingAccountId: string,
    context: AttachmentContext,
    subjectId: string,
    file: { buffer: Buffer; mimetype: string; size: number },
  ) {
    if (!this.storage.isAvailable)
      throw new ServiceUnavailableException('Object storage is not available');
    if (file.size > MAX_BYTES) throw new BadRequestException('File too large (max 10 MB)');
    if (!ALLOWED_MIME.includes(file.mimetype))
      throw new BadRequestException('Only image uploads are supported');

    await this.assertSubjectOwnership(actingAccountId, context, subjectId);

    // Re-encode display variants as WebP; keep the original bytes for fidelity.
    const md = await sharp(file.buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const thumb = await sharp(file.buffer)
      .rotate()
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();

    const attachment = await this.prisma.attachment.create({
      data: {
        ownerAccountId: actingAccountId,
        context,
        subjectId,
        mime: file.mimetype,
        sizeBytes: file.size,
        isPrivate: PRIVATE_CONTEXTS.includes(context),
      },
    });

    await this.storage.put(keyFor(attachment.id, 'original'), file.buffer, file.mimetype);
    await this.storage.put(keyFor(attachment.id, 'md'), md, 'image/webp');
    await this.storage.put(keyFor(attachment.id, 'thumb'), thumb, 'image/webp');

    return { id: attachment.id, context, subjectId, isPrivate: attachment.isPrivate };
  }

  /** Access rule: public contexts → anyone; private → owner or staff. */
  async getForServing(
    id: string,
    variant: Variant,
    viewer: { accountIds: string[]; isStaff: boolean } | null,
  ) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.isPrivate) {
      const allowed =
        viewer && (viewer.isStaff || viewer.accountIds.includes(attachment.ownerAccountId));
      if (!allowed) throw new ForbiddenException('Private attachment');
    }
    const object = await this.storage.getStream(keyFor(id, variant));
    if (!object) throw new NotFoundException('File missing from storage');
    return { object, attachment };
  }

  async remove(actingAccountId: string, id: string) {
    const attachment = await this.prisma.attachment.findUnique({ where: { id } });
    if (!attachment) throw new NotFoundException('Attachment not found');
    if (attachment.ownerAccountId !== actingAccountId)
      throw new ForbiddenException('Not your attachment');
    await this.prisma.attachment.delete({ where: { id } });
    await this.storage.delete([keyFor(id, 'original'), keyFor(id, 'md'), keyFor(id, 'thumb')]);
    return { ok: true };
  }

  listForSubjects(context: AttachmentContext, subjectIds: string[]) {
    if (!subjectIds.length) return Promise.resolve([]);
    return this.prisma.attachment.findMany({
      where: { context, subjectId: { in: subjectIds } },
      select: { id: true, subjectId: true, context: true, isPrivate: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async assertSubjectOwnership(
    accountId: string,
    context: AttachmentContext,
    subjectId: string,
  ) {
    switch (context) {
      case 'ITEM_PHOTO': {
        const item = await this.prisma.item.findUnique({
          where: { id: subjectId },
          include: { shipment: { include: { mission: true } } },
        });
        if (!item) throw new NotFoundException('Item not found');
        if (item.shipment.mission.accountId !== accountId)
          throw new ForbiddenException('Not your item');
        return;
      }
      case 'TRIP_VERIFICATION': {
        const mission = await this.prisma.mission.findUnique({ where: { id: subjectId } });
        if (!mission || mission.kind !== 'TRIP') throw new NotFoundException('Trip not found');
        if (mission.accountId !== accountId) throw new ForbiddenException('Not your trip');
        return;
      }
      case 'KYC': {
        // Verification attachments (ID photos, 5-sec liveness shot, address proofs…).
        const verification = await this.prisma.verification.findUnique({
          where: { id: subjectId },
        });
        if (!verification) throw new NotFoundException('Verification not found');
        if (verification.accountId !== accountId)
          throw new ForbiddenException('Not your verification');
        return;
      }
      default:
        // CHAT / REVIEW subjects arrive with their modules.
        throw new BadRequestException(`Uploads for ${context} are not enabled yet`);
    }
  }
}
