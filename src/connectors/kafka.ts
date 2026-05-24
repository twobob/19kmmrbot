import { injectable } from "inversify";

@injectable()
export class KafkaConnector {
  name = "Kafka (Mock)";

  async connect() {}
  async shutdown() {}
  async setupHealthCheck() {}
  async healthCheck() {
    return true;
  }

  producer(config?: any) {
    return {
      connect: async () => {},
      disconnect: async () => {},
      send: async (payload: any) => {
        console.log("Mock Kafka Producer sent message:", payload);
      }
    };
  }

  consumer(config?: any) {
    return {
      connect: async () => {},
      disconnect: async () => {},
      subscribe: async (config: any) => {},
      run: async (config: any) => {},
      on: (event: string, callback: Function) => {}
    };
  }
}

export class RoundRobinPartitioner {}
