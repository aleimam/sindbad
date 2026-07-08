import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../admin/guards/permissions.guard';
import { RequirePermissions } from '../admin/decorators/require-permissions.decorator';
import { ChatService } from './chat.service';

@ApiTags('admin/chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/chat')
export class AdminChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('threads')
  @RequirePermissions('chat.monitor')
  @ApiOperation({ summary: 'All conversations (spec: staff review all chats)' })
  threads() {
    return this.chat.adminThreads();
  }

  @Get('threads/:id/messages')
  @RequirePermissions('chat.monitor')
  messages(@Param('id') id: string) {
    return this.chat.adminMessages(id);
  }
}
