import { Module } from '@nestjs/common'
import { CafeController } from './cafe.controller'
import { CafeService } from './cafe.service'
import { CafeInteractionService } from './cafe-interaction.service'

@Module({
  controllers: [CafeController],
  providers: [CafeService, CafeInteractionService],
})
export class CafeModule {}
