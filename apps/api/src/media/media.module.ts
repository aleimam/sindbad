import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageService } from './storage.service';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';

@Global()
@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [StorageService, MediaService],
  exports: [MediaService, StorageService],
})
export class MediaModule {}
