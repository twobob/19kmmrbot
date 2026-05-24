import { injectable } from "inversify";

@injectable()
export class VaultConnector {
  name = "Vault (Mock)";
  async connect() {}
  async shutdown() {}
  async read(path: string) {
    return { data: { data: {} } };
  }
}
