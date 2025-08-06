import { Module } from '@nestjs/common';
import { CallServiceService } from './call-service.service';
import { CallServiceController } from './call-service.controllers';
import { RedisPubSubService } from './redis-pubsub.service';

@Module({
  controllers: [CallServiceController],
  providers: [CallServiceService],
})
export class CallServiceModule {}