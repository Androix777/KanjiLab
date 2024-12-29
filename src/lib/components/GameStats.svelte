<script lang="ts">
	import { getUsernameById } from "$lib/databaseTools";
	import type { AnswerStats, GameStats } from "$lib/types";
	import WebSocketClient from "$lib/webSocketClient.svelte";

	let webSocketClient: WebSocketClient = $state(WebSocketClient.getInstance());

	function calculateAnswerSum(playerId: number, answerStatsArray: AnswerStats[]) {
		let answerSum = 0;
		answerStatsArray.forEach((answerStats) => answerSum += (answerStats.userId == playerId && answerStats.isCorrect) ? 1 : 0);
		return answerSum;
	}

	function getPlayerIds(answerStatsArray: AnswerStats[]) {
		let playerIds: Set<number> = new Set<number>();
		answerStatsArray.forEach((answerStats) => playerIds.add(answerStats.userId));
		return Array.from(playerIds.values());
	}
</script>

{#if webSocketClient.gameStatus == `Lobby` && webSocketClient.lastGameId != 0}
	{#await Promise.all([webSocketClient.getCurrentGameStats(), webSocketClient.getCurrentGameAnswerStats()])}
		Loading stats...
	{:then [currentGameStats, currentGameAnswerStats]}
		{#each getPlayerIds(currentGameAnswerStats) as playerId}
			{#await getUsernameById(playerId) then username}
				<div>
					{`${username}: ${calculateAnswerSum(playerId, currentGameAnswerStats)}/${currentGameStats.roundsCount} correct answers`}
				</div>
			{/await}
		{/each}
	{/await}
{/if}
