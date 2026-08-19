import { Module } from '@nestjs/common'
import { AffinityService } from './affinity.service'
import { AffinityController } from './affinity.controller'
import { DatabaseModule } from '../storage/database/database.module'

@Module({
  imports: [DatabaseModule],
  providers: [AffinityService],
  controllers: [AffinityController],
  exports: [AffinityService],
})
export class AffinityModule {}
