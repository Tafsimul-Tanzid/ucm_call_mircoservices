import { Controller, Post, Body, Get, Query, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { CallControlDto, MakeCallDto } from './dto/call-control.dto';
import { CreateExtensionDto, UpdateExtensionDto } from './dto/extension.dto';
import { CallServiceService } from './call-service.service';

@Controller('call-service')
export class CallServiceController {
  constructor(private readonly service: CallServiceService) {}

  @Post('challenge')
  challenge(@Body() body: { request: { action: string; user: string } }) {
    return this.service.challenge(body.request);
  }
 
  @Post('login')
  login(@Body() dto: LoginDto) {
    console.log('Login called with DTO:', dto);
    return this.service.login(dto);
  }

  @Post('cdr-data')
  GetCdrData(@Body() requestData: any) {
    return this.service.GetCdrData(requestData);
  }

  @Post('recordings/fetch')
  fetchRecording(@Body() body: { 
    request: { 
      action: string; 
      cookie: string; 
      filename: string;
    } 
  }) {
    return this.service.fetchRecording(body.request);
  }

  // 🎵 Stream recording directly for Postman preview/play
  @Post('recordings/stream')
  async streamRecording(
    @Body() body: { 
      request: { 
        action: string; 
        cookie: string; 
        filename: string;
      } 
    },
    @Res() res: Response
  ) {
    try {
      const response = await this.service.fetchRecordingStream(body.request);
      
      // Set headers for audio streaming that Postman can preview
      res.set({
        'Content-Type': 'audio/wav',
        'Content-Disposition': `inline; filename="${body.request.filename}"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'Content-Disposition',
        'Cache-Control': 'no-cache'
      });

      // Pipe the stream directly to response
      response.data.pipe(res);
      
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // 🔍 Debug endpoints to check session/cookie status
  @Get('cookie/:user')
  getCookie(@Param('user') user: string) {
    const cookie = this.service.getCookie(user);
    
    if (cookie) {
      return {
        success: true,
        user: user,
        cookie: cookie,
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      success: false,
      message: `No cookie found for user: ${user}`,
      timestamp: new Date().toISOString()
    };
  }

  @Get('sessions')
  getAllSessions() {
    return this.service.getAllSessions();
  }

  // 🔧 Auto endpoints using stored sessions
  @Post('recordings/fetch/auto')
  fetchRecordingAuto(@Body() body: { 
    request: { 
      action: string; 
      filename: string;
    } 
  }, @Query('user') user: string = 'cdrapi') {
    return this.service.fetchRecordingWithSession(user, body.request);
  }

  @Post('cdr-data/auto')
  getCdrDataAuto(@Body() requestData: any, @Query('user') user: string = 'cdrapi') {
    return this.service.getCdrWithSession(user, requestData);
  }

  // 🧪 Test endpoint
  @Get('debug/session/:user')
  debugSession(@Param('user') user: string) {
    const session = this.service.getSession(user);
    
    return {
      user: user,
      hasSession: !!session,
      sessionData: session,
      timestamp: new Date().toISOString()
    };
  }

  // 🎯 Quick test endpoints
  @Post('cdr-data/simple')
  async getCdrDataSimple(@Query('user') user: string = 'cdrapi') {
    const cookie = this.service.getCookie(user);
    
    if (!cookie) {
      return {
        success: false,
        error: `No cookie found for user: ${user}. Please login first.`,
        timestamp: new Date().toISOString()
      };
    }

    const simpleRequest = {
      request: {
        action: "cdrapi",
        cookie: cookie,
        format: "json"
      }
    };

    console.log('🧪 Testing simple CDR request:', simpleRequest);
    return this.service.GetCdrData(simpleRequest);
  }
}