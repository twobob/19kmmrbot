import { ChatUserstate } from "tmi.js";

export const captureTwitchException = (
  e: Error,
  channel: string,
  tags: ChatUserstate,
  message: string,
) => {
  console.error(`[Twitch Error Logged] Channel: ${channel}, Msg: ${message}, User: ${tags.username}`, e);
  return `exception-${Date.now()}`;
};
