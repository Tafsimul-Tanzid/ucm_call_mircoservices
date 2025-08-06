import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { RedisConfig } from '../config/redis.config';

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private publisher: RedisClientType;
  private subscriber: RedisClientType;
  private isConnected: boolean = false;
  private subscriptions = new Map<string, (message: string) => void>();

  async onModuleInit() {
    try {
      // Create separate clients for publisher and subscriber
      this.publisher = createClient({
        socket: {
          host: RedisConfig.host,
          port: RedisConfig.port,
          connectTimeout: 10000,
        },
        password: RedisConfig.password,
        database: RedisConfig.db,
      });

      this.subscriber = createClient({
        socket: {
          host: RedisConfig.host,
          port: RedisConfig.port,
          connectTimeout: 10000,
        },
        password: RedisConfig.password,
        database: RedisConfig.db,
      });

      // Set up error handlers
      this.publisher.on('error', (err) => {
        console.error('Redis Publisher Error:', err.message);
        this.isConnected = false;
      });

      this.subscriber.on('error', (err) => {
        console.error('Redis Subscriber Error:', err.message);
        this.isConnected = false;
      });

      // Set up connection handlers
      this.publisher.on('connect', () => {
        console.log('✅ Redis Publisher connected');
      });

      this.subscriber.on('connect', () => {
        console.log('✅ Redis Subscriber connected');
        this.isConnected = true;
      });

      // Connect both clients
      await Promise.all([
        this.publisher.connect(),
        this.subscriber.connect()
      ]);

      console.log('🚀 Redis Pub/Sub service initialized');

    } catch (error) {
      console.error('❌ Failed to initialize Redis Pub/Sub:', error.message);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.publisher && this.publisher.isOpen) {
      await this.publisher.disconnect();
    }
    if (this.subscriber && this.subscriber.isOpen) {
      await this.subscriber.disconnect();
    }
  }

  async publish(channel: string, message: any): Promise<boolean> {
    if (!this.isConnected || !this.publisher.isOpen) {
      console.warn('Redis Publisher not connected, skipping publish');
      return false;
    }

    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      await this.publisher.publish(channel, messageStr);
      console.log(`📢 Published to channel "${channel}":`, message);
      return true;
    } catch (error) {
      console.error('Error publishing message:', error);
      return false;
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<boolean> {
    if (!this.isConnected || !this.subscriber.isOpen) {
      console.warn('Redis Subscriber not connected, skipping subscribe');
      return false;
    }

    try {
      this.subscriptions.set(channel, callback);
      
      await this.subscriber.subscribe(channel, (message) => {
        console.log(`📨 Received message from channel "${channel}":`, message);
        callback(message);
      });

      console.log(`👂 Subscribed to channel "${channel}"`);
      return true;
    } catch (error) {
      console.error('Error subscribing to channel:', error);
      return false;
    }
  }

  async unsubscribe(channel: string): Promise<boolean> {
    if (!this.isConnected || !this.subscriber.isOpen) {
      return false;
    }

    try {
      await this.subscriber.unsubscribe(channel);
      this.subscriptions.delete(channel);
      console.log(`🔇 Unsubscribed from channel "${channel}"`);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from channel:', error);
      return false;
    }
  }

  // Queue management methods
  async addToQueue(queueName: string, data: any): Promise<boolean> {
    if (!this.isConnected || !this.publisher.isOpen) {
      console.warn('Redis not connected, skipping queue add');
      return false;
    }

    try {
      const message = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        data: data
      };

      await this.publisher.lPush(queueName, JSON.stringify(message));
      console.log(`📥 Added to queue "${queueName}":`, message);
      
      // Also publish notification about new queue item
      await this.publish(`queue:${queueName}:new`, message);
      
      return true;
    } catch (error) {
      console.error('Error adding to queue:', error);
      return false;
    }
  }

  async getFromQueue(queueName: string): Promise<any | null> {
    if (!this.isConnected || !this.publisher.isOpen) {
      return null;
    }

    try {
      const message = await this.publisher.rPop(queueName);
      if (message) {
        const parsed = JSON.parse(message);
        console.log(`📤 Retrieved from queue "${queueName}":`, parsed);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('Error getting from queue:', error);
      return null;
    }
  }

  async getQueueLength(queueName: string): Promise<number> {
    if (!this.isConnected || !this.publisher.isOpen) {
      return 0;
    }

    try {
      return await this.publisher.lLen(queueName);
    } catch (error) {
      console.error('Error getting queue length:', error);
      return 0;
    }
  }

  getConnectionStatus(): { connected: boolean; subscriptions: string[] } {
    return {
      connected: this.isConnected,
      subscriptions: Array.from(this.subscriptions.keys())
    };
  }
}
