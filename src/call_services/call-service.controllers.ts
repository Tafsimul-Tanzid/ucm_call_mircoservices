import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { CallControlDto, MakeCallDto } from './dto/call-control.dto';
import { CreateExtensionDto, UpdateExtensionDto } from './dto/extension.dto';
import { CallServiceService } from './call-service.service';
import { GroupCallDto } from './dto/group-call.dto';


@Controller('call-service')
export class CallServiceController {
  constructor(private readonly service: CallServiceService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @Post('logout')
  logout(@Body('cookie') cookie: string) {
    return this.service.logout(cookie);
  }

  @Post('call/accept')
  acceptCall(@Body() dto: CallControlDto) {
    return this.service.acceptCall(dto);
  }

  @Post('call/refuse')
  refuseCall(@Body() dto: CallControlDto) {
    return this.service.refuseCall(dto);
  }

  @Post('call/make')
  makeCall(@Body() dto: MakeCallDto) {
    return this.service.makeCall(dto);
  }

  @Get('cdr')
  getCdr(@Query() params: any) {
    return this.service.getCdr(params);
  }

  @Get('recordings')
  listRecordings() {
    return this.service.listRecordings();
  }

  @Post('recordings/fetch')
  fetchRecording(@Body() body: { filedir: string; filename: string }) {
    return this.service.fetchRecording(body.filedir, body.filename);
  }

  @Post('extension/create')
  createExtension(
    @Body() dto: CreateExtensionDto,
    @Body('cookie') cookie: string,
  ) {
    return this.service.createExtension(dto, cookie);
  }

  @Post('extension/update')
  updateExtension(@Body() dto: UpdateExtensionDto) {
    return this.service.updateExtension(dto);
  }

  @Post('extension/delete')
  deleteExtension(
    @Body('extension') ext: string,
    @Body('cookie') cookie: string,
  ) {
    return this.service.deleteExtension(ext, cookie);
  }
  $1

@Post('call/group')
groupCall(@Body() dto: GroupCallDto) {
  return this.service.groupCall(dto);
}

}
