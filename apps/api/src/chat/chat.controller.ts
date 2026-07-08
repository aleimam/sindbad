import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  editMessageSchema,
  openThreadSchema,
  sendMessageSchema,
  type EditMessageInput,
  type OpenThreadInput,
  type SendMessageInput,
} from '@sindbad/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from '../accounts/accounts.service';
import { ChatService } from './chat.service';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly accounts: AccountsService,
  ) {}

  @Get('threads')
  @ApiOperation({ summary: 'My conversations (counterpart, last message, unread count)' })
  async threads(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.chat.myThreads(accountId);
  }

  @Post('threads')
  @ApiOperation({ summary: 'Open a conversation (needs a shared deal or active match)' })
  async open(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(openThreadSchema)) body: OpenThreadInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.chat.openThread(accountId, body.accountId);
  }

  @Get('threads/:id/messages')
  async messages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('before') before?: string,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.chat.messages(id, accountId, before);
  }

  @Post('threads/:id/messages')
  @ApiOperation({ summary: 'Send (photos attach via /media with context CHAT afterwards)' })
  async send(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.chat.send(id, accountId, body.body, body.replyToId);
  }

  @Post('threads/:id/read')
  @HttpCode(200)
  async markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.chat.markRead(id, accountId);
  }

  @Post('messages/:id/edit')
  @HttpCode(200)
  async edit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(editMessageSchema)) body: EditMessageInput,
  ) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.chat.edit(id, accountId, body.body);
  }

  @Post('messages/:id/unsend')
  @HttpCode(200)
  async unsend(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.chat.unsend(id, accountId);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthenticatedUser) {
    const accountId = await this.accounts.getActingAccountId(user.userId);
    return this.chat.unreadCount(accountId);
  }
}
