import { injectable, inject } from "inversify";
import { RedisConnector } from "../connectors/redis";
import { LeaderboardType, ULLeaderboard, leaderboardTypeToNumber } from "../definitions/leaderboard";
import fetch from "node-fetch";

@injectable()
export class LeaderboardService {
	constructor(@inject(RedisConnector) private redis: RedisConnector) {}

	async fetchLeaderboard(
		type = LeaderboardType.Standard,
	): Promise<ULLeaderboard | null> {
		const cacheKey = `ul:leaderboard:${type}`;
		const rawLeaderboard = await this.redis.getAsync(cacheKey);

		if (rawLeaderboard) {
			try {
				const parsed: ULLeaderboard = JSON.parse(rawLeaderboard);
				const nowInSeconds = Math.floor(Date.now() / 1000);
				
				// If the cached leaderboard hasn't expired yet, return it
				if (parsed.next_scheduled_post_time && nowInSeconds < parsed.next_scheduled_post_time) {
					return parsed;
				}

				// Cache has expired; attempt to fetch a fresh one
				const freshLeaderboard = await this.retrieveFromAPI(type);
				if (freshLeaderboard) {
					await this.redis.setAsync(cacheKey, JSON.stringify(freshLeaderboard));
					return freshLeaderboard;
				}

				// If API fetch fails, return the expired cached data as a fallback
				return parsed;
			} catch (e) {
				// If JSON parsing fails, fall back to fetching fresh
			}
		}

		// Cache does not exist; fetch and store
		const freshLeaderboard = await this.retrieveFromAPI(type);
		if (freshLeaderboard) {
			await this.redis.setAsync(cacheKey, JSON.stringify(freshLeaderboard));
			return freshLeaderboard;
		}

		return null;
	}

	private async retrieveFromAPI(type: LeaderboardType): Promise<ULLeaderboard | null> {
		try {
			const championship = leaderboardTypeToNumber(type);
			if (championship === -1) {
				return null;
			}

			const url = `https://underlords.com/leaderboarddata?championship=${championship}`;
			const response = await fetch(url);
			if (!response.ok) {
				return null;
			}

			const data = await response.json() as ULLeaderboard;
			if (data && Array.isArray(data.leaderboard)) {
				return data;
			}
		} catch (e) {
			// Fail silently and return null to handle downstream fallbacks
		}
		return null;
	}
}
