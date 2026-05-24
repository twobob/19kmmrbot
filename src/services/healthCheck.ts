import { inject, injectable } from "inversify";
import { Logger } from "../logger";

export interface HealthCheckable {
  name: string;
  setupHealthCheck: () => Promise<unknown>;
  healthCheck: () => Promise<boolean>;
  shutdown: () => Promise<unknown>;
}

@injectable()
export class HealthCheck {
  live = false;

  constructor(
    @inject(Logger) public logger: Logger,
  ) {}

  addHealthCheck(healthCheck: HealthCheckable) {}
  removeHealthCheck(name: string) {}

  async start() {
    this.logger.info("HealthCheck service initialized (stub mode for cPanel)");
    this.live = true;
  }

  async shutdown() {}
}
