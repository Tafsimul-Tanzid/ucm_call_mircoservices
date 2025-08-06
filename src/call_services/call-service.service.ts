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
  // In-memory cache store
  private cache: Map<string, { value: any; expires: number }> = new Map();
  
  // In-memory session storage
  private sessions: Map<string, any> = new Map();

  constructor() {
    // Clean up expired cache and sessions every 5 minutes
    setInterval(() => {
      this.cleanupExpiredCache();
      this.clearExpiredSessions();
    }, 5 * 60 * 1000);
  }

  // Get value from cache if not expired
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && entry.expires > Date.now()) {
      return entry.value;
    }
    this.cache.delete(key);
    return null;
  }

  // Set value in cache with TTL (seconds)
  set(key: string, value: any, ttlSeconds: number): void {
    const expires = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expires });
  }

  // Delete specific cache key
  del(key: string): boolean {
    return this.cache.delete(key);
  }

  // Clear all cache
  clearAllCache(): void {
    this.cache.clear();
    console.log('🧹 All cache cleared');
  }

  // Simple cache key generator based on type and params
  generateCacheKey(type: string, params: Record<string, any>): string {
    const paramString = Object.entries(params)
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    return `${type}|${paramString}`;
  }

  // Session storage methods
  storeSessionData(user: string, sessionData: any): void {
    const sessionKey = `session:${user}`;
    const dataWithTimestamp = {
      ...sessionData,
      storedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
    };
    
    this.sessions.set(sessionKey, dataWithTimestamp);
    console.log(`💾 Session data stored for user: ${user}`);
  }

  getSessionData(user: string): any | null {
    const sessionKey = `session:${user}`;
    const sessionData = this.sessions.get(sessionKey);
    
    if (sessionData) {
      // Check if expired
      const now = Date.now();
      const expiresAt = new Date(sessionData.expiresAt).getTime();
      
      if (now > expiresAt) {
        this.sessions.delete(sessionKey);
        console.log(`🗑️ Expired session removed for user: ${user}`);
        return null;
      }
      
      console.log(`📖 Session data retrieved for user: ${user}`);
      return sessionData;
    }
    
    return null;
  }

  getAllSessions(): Record<string, any> {
    const allSessions: Record<string, any> = {};
    const now = Date.now();
    
    for (const [key, sessionData] of this.sessions.entries()) {
      const user = key.replace('session:', '');
      const expiresAt = new Date(sessionData.expiresAt).getTime();
      
      sessionData.isExpired = now > expiresAt;
      sessionData.remainingTTL = Math.max(0, Math.floor((expiresAt - now) / 1000));
      
      allSessions[user] = sessionData;
    }
    
    return allSessions;
  }

  deleteSession(user: string): boolean {
    const sessionKey = `session:${user}`;
    const deleted = this.sessions.delete(sessionKey);
    
    if (deleted) {
      console.log(`🗑️ Session deleted for user: ${user}`);
    }
    
    return deleted;
  }

  clearExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, sessionData] of this.sessions.entries()) {
      const expiresAt = new Date(sessionData.expiresAt).getTime();
      if (now > expiresAt) {
        this.sessions.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  clearCacheByPattern(pattern: string): void {
    let deletedCount = 0;
    for (const [key] of this.cache.entries()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      console.log(`🗑️ Cleared ${deletedCount} cache entries matching pattern: ${pattern}`);
    }
  }

  getCacheStatus(): any {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires > now) {
        activeEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      activeEntries,
      expiredEntries,
      totalSessions: this.sessions.size,
      timestamp: new Date().toISOString()
    };
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires <= now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  async login(dto: LoginDto) {
    console.log('🔐 Starting login process for user:', dto.user);
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    if (!UCMConfig.baseUrl) {
      throw new Error('UCMConfig.baseUrl is not defined');
    }

    try {
      // Step 1: Get challenge
      console.log('🔐 Sending challenge request...');
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

      const challenge = challengeRes.data.response?.challenge;
      if (!challenge) {
        console.error('❌ No challenge received:', challengeRes.data);
        throw new Error('Challenge failed');
      }

      console.log('✅ Challenge received:', challenge);

      // Step 2: Hash password
      const passwordHash = crypto
        .createHash('md5')
        .update(`${dto.user}:${challenge}:${dto.password}`)
        .digest('hex');

      console.log('🔐 Sending login request...');
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
        {
          withCredentials: true,
          httpsAgent,
        },
      );

      console.log('📥 Login response:', loginRes.data);

      const status = loginRes.data.status;
      if (status !== 0) {
        console.error('❌ Login failed:', loginRes.data);
        throw new Error(`Login failed with status ${status}`);
      }

      const cookies = loginRes.headers['set-cookie'];
      if (!cookies) {
        throw new Error('No session cookie received');
      }

      console.log('✅ Login successful, cookie:', cookies[0]);

      // Store session data for password login
      const sessionData = {
        user: dto.user,
        loginMethod: 'password',
        challenge: challenge,
        passwordHash: passwordHash,
        cookie: cookies[0],
        loginResponse: loginRes.data,
        loginTimestamp: new Date().toISOString(),
        sessionId: `pwd_sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        isActive: true,
        loginStatus: status
      };

      this.storeSessionData(dto.user, sessionData);

      return { cookie: cookies[0] };

    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  }

  async challenge(body: { action: string; user: string }) {
    console.log('🔐 Starting challenge process for user:', body.user);
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    if (!UCMConfig.baseUrl) {
      throw new Error('UCMConfig.baseUrl is not defined');
    }

    try {
      console.log('🔐 Sending challenge request...');
      const challengeRes = await axios.post(
        UCMConfig.baseUrl,
        {
          request: {
            action: body.action,
            user: body.user,
            version: UCMConfig.version,
          },
        },
        { 
          httpsAgent,
          timeout: 10000
        },
      );

      console.log('✅ Challenge response:', challengeRes.data);

      // Initialize variables
      let token: string | null = null;
      let loginResponse: any = null;
      let sessionCookie: string | null = null;

      if (challengeRes.data?.response?.challenge) {
        token = await this.generateGrandstreamToken(
          { challenge: challengeRes.data.response.challenge },
          body.user
        );
        console.log('🔑 Generated token:', token);

        // Automatically perform login with the generated token
        console.log('🔐 Performing automatic login with token...');
        try {
          const loginRes = await axios.post(
            UCMConfig.baseUrl,
            {
              request: {
                action: 'login',
                user: body.user,
                token: token,
              },
            },
            {
              httpsAgent,
              timeout: 10000
            },
          );

          console.log('📥 Auto login response:', loginRes.data);
          loginResponse = loginRes.data;

          // 🚀 EXTRACT AND STORE SESSION COOKIE
          if (loginResponse && loginResponse.status === 0) {
            if (loginResponse.response?.cookie) {
              sessionCookie = loginResponse.response.cookie;
              console.log('🍪 Session cookie extracted:', sessionCookie);
              if (sessionCookie) {
                console.log('📏 Cookie length:', sessionCookie.length);
              }

              // Store session data in memory
              const sessionData = {
                user: body.user,
                loginMethod: 'challenge_auto_login',
                challenge: challengeRes.data.response.challenge,
                token: token,
                cookie: sessionCookie,
                cookieLength: sessionCookie?.length ?? 0,
                challengeResponse: challengeRes.data,
                loginResponse: loginResponse,
                loginTimestamp: new Date().toISOString(),
                sessionId: `chal_sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                isActive: true,
                loginStatus: loginResponse.status
              };

              // Store the session
              this.storeSessionData(body.user, sessionData);

              console.log('✅ Session data stored successfully!');
              console.log('📊 Session summary:', {
                user: body.user,
                cookie: sessionCookie,
                cookieLength: sessionCookie?.length ?? 0,
                tokenGenerated: !!token,
                loginStatus: loginResponse.status
              });

            } else {
              console.log('⚠️ Login successful but no cookie in response');
              console.log('🔍 Full login response:', JSON.stringify(loginResponse, null, 2));
            }
          } else {
            console.error('❌ Auto login failed - status:', loginResponse?.status);
          }

        } catch (loginError: any) {
          console.error('❌ Auto login failed:', loginError.message);
          loginResponse = {
            status: -1,
            error: 'Auto login failed',
            message: loginError.message,
            timestamp: new Date().toISOString()
          };
        }
      }

      // Return comprehensive response
      const response = {
        success: true,
        challenge: challengeRes.data,
        token: token,
        login: loginResponse,
        sessionCookie: sessionCookie,
        user: body.user,
        timestamp: new Date().toISOString(),
        sessionStored: !!(sessionCookie && loginResponse?.status === 0),
        cookieLength: sessionCookie?.length || 0
      };

      return response;

    } catch (error: any) {
      console.error('❌ Challenge process failed:', error.message);
      
      return {
        success: false,
        error: 'Challenge failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        user: body.user
      };
    }
  }

  async generateGrandstreamToken(
    dto: { challenge: string },
    user: any,
  ) {
    const challenge = dto?.challenge;
    console.log('🔐 Challenge received for token generation:', challenge);
    const password = 'cdrapi123';
    const token = crypto.createHash('md5').update(challenge + password).digest('hex');
    console.log('🔑 Generated Grandstream token:', token);
    return token;
  }

  async tokenLogin(body: { action: string; user: string; token: string }) {
    console.log('🔐 Starting token-based login process for user:', body.user);
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    if (!UCMConfig.baseUrl) {
      throw new Error('UCMConfig.baseUrl is not defined');
    }

    try {
      console.log('🔐 Sending token login request...');
      const loginRes = await axios.post(
        UCMConfig.baseUrl,
        {
          request: {
            action: body.action,
            user: body.user,
            token: body.token,
            version: UCMConfig.version,
          },
        },
        {
          httpsAgent,
          timeout: 10000
        },
      );

      console.log('📥 Token login response:', loginRes.data);

      const status = loginRes.data.status;
      if (status !== 0) {
        console.error('❌ Token login failed:', loginRes.data);
        throw new Error(`Token login failed with status ${status}`);
      }

      // 🚀 STORE SESSION DATA FOR TOKEN LOGIN
      if (loginRes.data.response?.cookie) {
        const sessionCookie = loginRes.data.response.cookie;
        console.log('🍪 Token login cookie:', sessionCookie);
        
        const sessionData = {
          user: body.user,
          loginMethod: 'token',
          token: body.token,
          cookie: sessionCookie,
          cookieLength: sessionCookie.length,
          loginResponse: loginRes.data,
          loginTimestamp: new Date().toISOString(),
          sessionId: `token_sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          isActive: true,
          loginStatus: status
        };

        this.storeSessionData(body.user, sessionData);
        console.log('✅ Token login session stored');
      }

      return loginRes.data;

    } catch (error: any) {
      console.error('❌ Token login failed:', error.message);
      throw error;
    }
  }
  async GetCdrData(requestData: any) {
    try {
      // Default request structure
      const defaultRequest = {
        request: {
          action: requestData.action,
          cookie: requestData.cookie,
          caller: requestData.caller,
          callee: requestData.callee,
          format: requestData.format,
          startTime: requestData.startTime,
          endTime: requestData.endTime,
        }
      };

      // Merge with any additional request data provided
      const apiRequest = requestData.request ? requestData : defaultRequest;

      console.log('📞 Making CDR API call...');
      console.log('Request payload:', JSON.stringify(apiRequest, null, 2));

      const response = await axios({
        method: 'POST',
        url: 'https://103.139.234.50:8089/api',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data: apiRequest,
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        }),
        timeout: 30000
      });

      console.log('✅ CDR API Response:', response.data);

      return {
        success: true,
        data: response.data,
        status: response.status,
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('❌ CDR API call failed:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        return {
          success: false,
          error: 'CDR API responded with error',
          status: error.response.status,
          data: error.response.data,
          timestamp: new Date().toISOString()
        };
      } else if (error.request) {
        return {
          success: false,
          error: 'Network error - unable to reach CDR API',
          message: error.message,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: 'CDR API request configuration error',
          message: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  // async listRecordings() {
  //   const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    
  //   try {
  //     return await axios.get(`${UCMConfig.recapiUrl}?format=json`, {
  //       auth: { username: UCMConfig.user, password: UCMConfig.password },
  //       httpsAgent
  //     });
  //   } catch (error: any) {
  //     console.error('❌ List recordings failed:', error.message);
  //     throw error;
  //   }
  // }

async fetchRecording(requestData: { 
  action: string; 
  cookie: string; 
  filename: string;
}) {
  try {
    console.log('📥 Fetching recording with request:', requestData);
    
    // Generate cache key for recording data
    const cacheKey = this.generateCacheKey('recording', { 
      filename: requestData.filename,
      action: requestData.action 
    });
    
    // Check cache first (cache recordings for 30 minutes)
    console.log('🔍 Checking in-memory cache for recording...');
    const cachedData = this.get(cacheKey);
    
    if (cachedData) {
      console.log('✅ Recording found in cache');
      return {
        success: true,
        filename: requestData.filename,
        contentType: 'audio/wav',
        data: cachedData.toString('base64'), // Convert to base64 for JSON response
        binaryData: cachedData, // Keep original binary for streaming
        cached: true,
        timestamp: new Date().toISOString()
      };
    }
    
    console.log('❌ Recording not found in cache, fetching from API...');

    // Prepare the request payload
    const apiRequest = {
      request: {
        action: requestData.action,
        cookie: requestData.cookie,
        filename: requestData.filename
      }
    };

    console.log('📞 Making recording API call...');
    console.log('Request payload:', JSON.stringify(apiRequest, null, 2));

    const response = await axios({
      method: 'POST',
      url: 'https://103.139.234.50:8089/api',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      data: apiRequest,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      }),
      timeout: 30000,
      responseType: 'arraybuffer'
    });

    console.log('✅ Recording API Response received');
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Content-Length:', response.headers['content-length']);

    if (response.status === 200) {
      const binaryData = Buffer.from(response.data);
      
      // Cache the binary data for 30 minutes
      console.log('💾 Caching recording data...');
      this.set(cacheKey, binaryData, 1800);

      return {
        success: true,
        filename: requestData.filename,
        contentType: response.headers['content-type'] || 'audio/wav',
        contentLength: response.headers['content-length'],
        data: binaryData.toString('base64'), // Base64 for JSON response
        binaryData: binaryData, // Binary data for direct streaming
        cached: false,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        error: `Recording API returned status ${response.status}`,
        status: response.status,
        timestamp: new Date().toISOString()
      };
    }

  } catch (error: any) {
    console.error('❌ Recording fetch failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data?.toString?.() || 'Binary data');
      
      return {
        success: false,
        error: `Recording API error: ${error.response.status}`,
        status: error.response.status,
        timestamp: new Date().toISOString()
      };
    } else if (error.request) {
      return {
        success: false,
        error: 'Network error - unable to reach recording API',
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        error: `Recording API request error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}


  // Cookie management helpers
  storeCookieForCDR(user: string, cookie: string): void {
    const cdrCacheKey = this.generateCacheKey('cdr_cookie', { user });
    this.set(cdrCacheKey, cookie, 900); // 15 minutes TTL
    console.log(`🍪 CDR cookie stored for user: ${user}`);
  }

  getCookieForCDR(user: string): string | null {
    const cdrCacheKey = this.generateCacheKey('cdr_cookie', { user });
    const cookie = this.get(cdrCacheKey);
    
    if (cookie) {
      console.log(`🍪 CDR cookie retrieved for user: ${user}`);
      return cookie;
    }
    
    console.log(`❌ No CDR cookie found for user: ${user}`);
    return null;
  }

  // Clear previous cache entries for a user to avoid conflicts
  clearPreviousCacheForUser(user: string): void {
    let deletedCount = 0;
    for (const [key] of this.cache.entries()) {
      if (key.includes(`user:${user}`)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      console.log(`🗑️ Cleared ${deletedCount} previous cache entries for user: ${user}`);
    }
  }

  // Session validation
  async validateSessionCookie(user: string, cookie: string): Promise<any> {
    try {
      const sessionData = this.getSessionData(user);
      
      if (!sessionData) {
        return {
          isValid: false,
          message: 'No active session found',
          user: user
        };
      }

      const storedCookie = sessionData.cookie;
      const isValid = storedCookie === cookie;
      
      return {
        isValid: isValid,
        user: user,
        inputCookie: cookie,
        storedCookie: storedCookie,
        cookieMatch: isValid,
        sessionStatus: sessionData.isExpired ? 'expired' : 'active',
        remainingTTL: sessionData.remainingTTL,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message,
        user: user,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get active cookies for all users
  getActiveCookies(): any {
    try {
      const activeCookies: any[] = [];
      const now = Date.now();

      for (const [key, sessionData] of this.sessions.entries()) {
        const user = key.replace('session:', '');
        const expiresAt = new Date(sessionData.expiresAt).getTime();
        
        if (now <= expiresAt && sessionData.cookie) {
          activeCookies.push({
            user: user,
            cookie: sessionData.cookie,
            cookieLength: sessionData.cookie.length,
            loginMethod: sessionData.loginMethod,
            createdAt: sessionData.storedAt,
            expiresAt: sessionData.expiresAt,
            remainingTTL: Math.max(0, Math.floor((expiresAt - now) / 1000))
          });
        }
      }

      return {
        success: true,
        activeCount: activeCookies.length,
        cookies: activeCookies,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Simple session storage methods for recording functionality
storeSession(user: string, cookie: string): void {
  const sessionData = {
    user: user,
    cookie: cookie,
    loginMethod: 'simple_storage',
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
    sessionId: `simple_sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    isActive: true
  };
  
  this.storeSessionData(user, sessionData);
  console.log(`💾 Simple session stored for user: ${user}`);
}

getSession(user: string): any | null {
  return this.getSessionData(user);
}

getCookie(user: string): string | null {
  const session = this.getSession(user);
  return session ? session.cookie : null;
}

// Fetch recording using stored session
async fetchRecordingWithSession(user: string, requestData: { 
  action: string; 
  filename: string;
}) {
  const session = this.getSession(user);
  
  if (!session) {
    return {
      success: false,
      error: `No session found for user: ${user}. Please login first.`,
      timestamp: new Date().toISOString()
    };
  }

  // Add cookie to request
  const recordingRequest = {
    action: requestData.action,
    cookie: session.cookie,
    filename: requestData.filename
  };

  console.log('🔍 Using stored cookie for recording:', session.cookie);
  return await this.fetchRecording(recordingRequest);
}

// Stream recording for Postman preview/play
async fetchRecordingStream(requestData: { 
  action: string; 
  cookie: string; 
  filename: string;
}) {
  try {
    console.log('📥 Fetching recording stream with request:', requestData);

    const apiRequest = {
      request: {
        action: requestData.action,
        cookie: requestData.cookie,
        filename: requestData.filename
      }
    };

    const response = await axios({
      method: 'POST',
      url: 'https://103.139.234.50:8089/api',
      headers: {
        'Content-Type': 'application/json',
      },
      data: apiRequest,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      }),
      timeout: 30000,
      responseType: 'stream' // Stream for direct download/preview
    });

    return response;

  } catch (error: any) {
    console.error('❌ Recording stream fetch failed:', error.message);
    throw error;
  }
}

// CDR data using stored session (for compatibility)
async getCdrWithSession(user: string, requestData: any) {
  const session = this.getSession(user);
  
  if (!session) {
    return {
      success: false,
      error: `No session found for user: ${user}. Please login first.`,
      timestamp: new Date().toISOString()
    };
  }

  // Add cookie to request
  const cdrRequest = {
    ...requestData,
    request: {
      ...requestData.request,
      cookie: session.cookie
    }
  };

  console.log('🔍 Using stored cookie for CDR:', session.cookie);
  return await this.GetCdrData(cdrRequest);
}

// Test CDR API step by step
async testCdrApi(user: string = 'cdrapi') {
  console.log('🧪 Starting CDR API test...');
  
  const session = this.getSession(user);
  if (!session) {
    return {
      success: false,
      error: `No session found for user: ${user}`,
      timestamp: new Date().toISOString()
    };
  }

  const cookie = session.cookie;
  console.log('🍪 Using cookie:', cookie);

  // Test 1: Simple request (no dates)
  console.log('🧪 Test 1: Simple CDR request');
  const test1 = {
    request: {
      action: "cdrapi",
      cookie: cookie,
      format: "json"
    }
  };

  const result1 = await this.GetCdrData(test1);
  console.log('📊 Test 1 Result:', result1);

  if (!result1.success) {
    return {
      step: 'simple_request',
      failed: true,
      result: result1,
      message: 'Simple CDR request failed',
      timestamp: new Date().toISOString()
    };
  }

  // Test 2: With recent dates
  console.log('🧪 Test 2: CDR with recent dates');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const test2 = {
    request: {
      action: "cdrapi",
      cookie: cookie,
      startTime: yesterday.toISOString().split('T')[0] + " 00:00:00",
      endTime: today.toISOString().split('T')[0] + " 23:59:59",
      format: "json"
    }
  };

  const result2 = await this.GetCdrData(test2);
  console.log('📊 Test 2 Result:', result2);

  return {
    success: true,
    tests: {
      simple: result1,
      withDates: result2
    },
    cookie: cookie,
    timestamp: new Date().toISOString()
  };
}

// Additional helper methods for backwards compatibility
async logout(cookie: string) {
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  
  try {
    const response = await axios.post(
      UCMConfig.baseUrl,
      { request: { action: 'logout' } },
      { 
        headers: { Cookie: cookie },
        httpsAgent
      },
    );

    return response.data;
  } catch (error: any) {
    console.error('❌ Logout failed:', error.message);
    throw error;
  }
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

  return response.data;
}
}