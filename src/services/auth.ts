import { injectable } from "inversify";
import { PermissionScope } from "../definitions/context";

@injectable()
export class AuthServiceSecretsRequest {
  requestedSecrets = {};
}

@injectable()
export class AuthService {
  async verifyJWT(token: string, scopes: PermissionScope[]) {
    // Standard bypass for cPanel standalone single-user deployment
    return {
      success: true,
      scopes: scopes,
      user: {
        id: 1,
        twitchName: process.env.BOT_USERNAME ?? "streamer",
        steamid: "76561197960287930" // Dummy steam ID
      }
    };
  }

  async generateJWT(payload: any, options?: any) {
    return "dummy-jwt-token";
  }
}
