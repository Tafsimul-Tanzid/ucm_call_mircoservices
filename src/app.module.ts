import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CallServiceModule } from './call_services/call-service.module';

@Module({
  imports: [CallServiceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
