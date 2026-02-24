import mqtt, { MqttClient } from 'mqtt';

export interface DeviceData {
  type: string;
  device: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  status: 'online' | 'offline';
  cpu_percent: number;
  ram_percent: number;
  ram_used_mb: number;
  ram_total_mb: number;
}

export type MessageHandler = (data: DeviceData) => void;
export type ConnectionHandler = (connected: boolean) => void;

class MQTTService {
  private client: MqttClient | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private connectionHandlers: ConnectionHandler[] = [];
  private brokerUrl = 'wss://broker.emqx.io:8084/mqtt';

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.client = mqtt.connect(this.brokerUrl, {
          clientId: `device-dashboard-${Math.random().toString(16).slice(2, 8)}`,
          clean: true,
          reconnectPeriod: 1000,
          connectTimeout: 30000,
        });

        this.client.on('connect', () => {
          console.log('[MQTT] Connected to broker');
          this.notifyConnectionHandlers(true);
          resolve();
        });

        this.client.on('disconnect', () => {
          console.log('[MQTT] Disconnected from broker');
          this.notifyConnectionHandlers(false);
        });

        this.client.on('error', (error) => {
          console.error('[MQTT] Connection error:', error);
          this.notifyConnectionHandlers(false);
          reject(error);
        });

        this.client.on('message', (topic: string, payload: Buffer) => {
          this.handleMessage(topic, payload);
        });
      } catch (error) {
        console.error('[MQTT] Connection failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Subscribe to a topic
   */
  subscribe(topic: string, handler: MessageHandler): void {
    if (!this.client) {
      console.warn('[MQTT] Client not connected, cannot subscribe');
      return;
    }

    if (!this.messageHandlers.has(topic)) {
      this.messageHandlers.set(topic, []);
      this.client.subscribe(topic, (error) => {
        if (error) {
          console.error(`[MQTT] Failed to subscribe to ${topic}:`, error);
        } else {
          console.log(`[MQTT] Subscribed to ${topic}`);
        }
      });
    }

    const handlers = this.messageHandlers.get(topic)!;
    if (!handlers.includes(handler)) {
      handlers.push(handler);
    }
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(topic: string, handler?: MessageHandler): void {
    if (!this.client) return;

    if (handler) {
      const handlers = this.messageHandlers.get(topic);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
        // If no more handlers, unsubscribe from topic
        if (handlers.length === 0) {
          this.messageHandlers.delete(topic);
          this.client.unsubscribe(topic);
        }
      }
    } else {
      this.messageHandlers.delete(topic);
      this.client.unsubscribe(topic);
    }
  }

  /**
   * Register a connection state handler
   */
  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.push(handler);
    // Return unsubscribe function
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Disconnect from broker
   */
  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.messageHandlers.clear();
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client ? this.client.connected : false;
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(topic: string, payload: Buffer): void {
    try {
      const message = payload.toString('utf-8');
      const data = JSON.parse(message) as DeviceData;

      const handlers = this.messageHandlers.get(topic);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(data);
          } catch (error) {
            console.error('[MQTT] Error in message handler:', error);
          }
        });
      }
    } catch (error) {
      console.error('[MQTT] Failed to parse message:', error);
    }
  }

  /**
   * Notify all connection handlers
   */
  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach((handler) => {
      try {
        handler(connected);
      } catch (error) {
        console.error('[MQTT] Error in connection handler:', error);
      }
    });
  }
}

// Singleton instance
export const mqttService = new MQTTService();
