import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AttachmentContext } from '@prisma/client';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ACCESS_COOKIE } from '../auth/cookies';
import { TokenService } from '../auth/token.service';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService, type Variant } from './media.service';

const UPLOAD_CONTEXTS: AttachmentContext[] = ['ITEM_PHOTO', 'TRIP_VERIFICATION'];
const VARIANTS: Variant[] = ['original', 'md', 'thumb'];

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly tokens: TokenService,
    private readonly accounts: AccountsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image (compressed + thumbnailed automatically)' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { context?: string; subjectId?: string },
  ) {
    if (!file) throw new BadRequestException('No file provided');
    const context = body.context as AttachmentContext;
    if (!context || !UPLOAD_CONTEXTS.includes(context))
      throw new BadRequestException(`context must be one of: ${UPLOAD_CONTEXTS.join(', ')}`);
    if (!body.subjectId) throw new BadRequestException('subjectId is required');

    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.media.upload(accountId, context, body.subjectId, file);
  }

  @Get(':id/:variant')
  @ApiOperation({ summary: 'Serve a stored image (private files need owner/staff auth)' })
  async serve(
    @Param('id') id: string,
    @Param('variant') variant: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!VARIANTS.includes(variant as Variant)) throw new BadRequestException('Unknown variant');

    const viewer = await this.resolveViewer(req);
    const { object } = await this.media.getForServing(id, variant as Variant, viewer);

    res.setHeader('Content-Type', object.contentType ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    object.stream.pipe(res);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.media.remove(accountId, id);
  }

  /** Optional auth: resolve the viewer if a valid token rides along, else null. */
  private async resolveViewer(req: Request) {
    const header = req.headers.authorization;
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : cookies?.[ACCESS_COOKIE];
    if (!token) return null;
    try {
      const payload = this.tokens.verifyAccessToken(token);
      const [accountIds, dbUser] = await Promise.all([
        this.accounts.getAccountIds(payload.sub),
        this.prisma.user.findUnique({ where: { id: payload.sub }, select: { isStaff: true } }),
      ]);
      return { accountIds, isStaff: Boolean(dbUser?.isStaff) };
    } catch {
      return null;
    }
  }
}
