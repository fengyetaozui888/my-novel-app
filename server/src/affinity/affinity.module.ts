import { Module } from '@nestjs/common'
import { AffinityService } from './affinity.service'
import { AffinityController } from './affinity.controller'

@Module({
  controllers: [AffinityController],
  providers: [AffinityService],
  exports: [AffinityService],
})
export class AffinityModule {}
