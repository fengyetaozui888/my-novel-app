import { Module } from '@nestjs/common';
import { HelpAskController } from './help-ask.controller';
import { HelpAskService } from './help-ask.service';

@Module({
  controllers: [HelpAskController],
  providers: [HelpAskService],
})
export class HelpAskModule {}
