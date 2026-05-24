import { injectable } from "inversify";

export interface SecretsRequest {
  requestedSecrets?: Record<string, Record<string, string | undefined>>;
}

@injectable()
export class SecretsManager<
  T extends Record<string, Record<string, string | undefined>>
> {
  requestedSecrets?: T;
  secrets: T;

  constructor() {
    this.secrets = {} as T;
  }

  async getSecrets(override = false): Promise<T> {
    const oauthToken = process.env.TWITCH_OAUTH_TOKEN ?? "";
    const dbPassword = process.env.DB_PASSWORD ?? "";

    this.secrets = {
      twitchBot: {
        oauthToken: oauthToken
      },
      postgres: {
        password: dbPassword
      }
    } as unknown as T;

    return this.secrets;
  }
}
