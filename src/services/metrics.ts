import { inject, injectable } from "inversify";
import { Logger } from "../logger";

export const servicePrefix = "fortify_bot";

export class MockRegistry {
  contentType = "text/plain";
  async metrics() {
    return "";
  }
}

// Mock Gauge/Summary to satisfy tmi.js metrics code in index.ts
export class Gauge {
  constructor(opts: any) {}
  set(val: any) {}
}

export class Summary {
  constructor(opts: any) {}
  startTimer() {
    return (labels?: any) => {};
  }
}

export const promClient = {
  Gauge,
  Summary
};

@injectable()
export class MetricsService {
  register = new MockRegistry();

  constructor(@inject(Logger) public logger: Logger) {}

  async start() {
    this.logger.info("Metrics service initialized (stub mode for cPanel)");
  }

  async shutdown() {}
}
