import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { UCMConfig } from '../config/ucm.config';
import { LoginDto } from './dto/login.dto';
import { CallControlDto, MakeCallDto } from './dto/call-control.dto';
import { CreateExtensionDto, UpdateExtensionDto } from './dto/extension.dto';
import { GroupCallDto } from './dto/group-call.dto';
import * as https from 'https';
@Injectable()
export class CallServiceService {
  async login(dto: LoginDto) {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    console.log(UCMConfig.baseUrl, 'hello');

    const challengeRes = await axios.post(
      UCMConfig.baseUrl,
      {
        request: {
          action: 'challenge',
          user: dto.user,
          version: UCMConfig.version,
        },
      },
      { httpsAgent },
    );

    console.log(challengeRes.data, 'oka');

    const challenge = challengeRes.data.response.challenge;

    const passwordHash = crypto
      .createHash('md5')
      .update(`${dto.user}:${challenge}:${dto.password}`)
      .digest('hex');

    const loginRes = await axios.post(
      UCMConfig.baseUrl,
      {
        request: {
          action: 'login',
          user: dto.user,
          password: passwordHash,
          version: UCMConfig.version,
        },
      },
      { withCredentials: true, httpsAgent },
    );

    console.log(loginRes.data, 'loginRes');

    // Return only necessary part, e.g. cookies or loginRes.data
    return loginRes.headers['set-cookie'];
  }

  async logout(cookie: string) {
    return await axios.post(
      UCMConfig.baseUrl,
      { request: { action: 'logout' } },
      { headers: { Cookie: cookie } },
    );
  }

  async acceptCall(dto: CallControlDto) {
    return await axios.post(
      UCMConfig.baseUrl,
      { request: { action: 'acceptCall', callID: dto.callId } },
      { headers: { Cookie: dto.cookie } },
    );
  }

  async refuseCall(dto: CallControlDto) {
    return await axios.post(
      UCMConfig.baseUrl,
      { request: { action: 'refuseCall', callID: dto.callId } },
      { headers: { Cookie: dto.cookie } },
    );
  }

  async makeCall(dto: MakeCallDto) {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    const response = await axios.post(
      UCMConfig.baseUrl,
      { request: { action: 'call', ext: dto.srcExt, number: dto.dst } },
      {
        headers: { Cookie: dto.cookie },
        httpsAgent,
      },
    );

    // Return only response data (or whatever is relevant)
    return response.data;
  }

  async getCdr(params: any) {
    const query = new URLSearchParams({ format: 'json', ...params }).toString();
    return await axios.get(`${UCMConfig.cdrapiUrl}?${query}`, {
      auth: { username: UCMConfig.user, password: UCMConfig.password },
    });
  }

  async listRecordings() {
    return await axios.get(`${UCMConfig.recapiUrl}?format=json`, {
      auth: { username: UCMConfig.user, password: UCMConfig.password },
    });
  }

  async fetchRecording(filedir: string, filename: string) {
    const query = new URLSearchParams({
      filedir,
      filename,
      format: 'wav',
    }).toString();
    return await axios.get(`${UCMConfig.recapiUrl}?${query}`, {
      responseType: 'arraybuffer',
      auth: { username: UCMConfig.user, password: UCMConfig.password },
    });
  }

  async createExtension(dto: CreateExtensionDto, cookie: string) {
    return await axios.post(
      UCMConfig.baseUrl,
      { request: { action: 'addSIPAccount', ...dto } },
      { headers: { Cookie: cookie } },
    );
  }

  async updateExtension(dto: UpdateExtensionDto) {
    const { cookie, ...data } = dto;
    return await axios.post(
      UCMConfig.baseUrl,
      { request: { action: 'updateSIPAccount', ...data } },
      { headers: { Cookie: cookie } },
    );
  }

  async deleteExtension(ext: string, cookie: string) {
    return await axios.post(
      UCMConfig.baseUrl,
      { request: { action: 'deleteSIPAccount', ext } },
      { headers: { Cookie: cookie } },
    );
  }

  async groupCall(dto: GroupCallDto) {
    const callPromises = dto.dstExtensions.map((dst) =>
      axios.post(
        UCMConfig.baseUrl,
        { request: { action: 'call', ext: dto.srcExt, number: dst } },
        { headers: { Cookie: dto.cookie } },
      ),
    );
    return Promise.all(callPromises);
  }
}
