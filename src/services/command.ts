import { injectable } from "inversify";
import { Client } from "tmi.js";

@injectable()
export class BotCommandProcessor {
  async process(payload: any, client: Client) {
    // Noop stub for standalone mode (no Kafka events)
  }
}
