<script lang="ts">
	import { getUsernameById } from "$lib/databaseTools";
	import type { AnswerStats, GameStats } from "$lib/types";
	import WebSocketClient from "$lib/webSocketClient.svelte";
    import { onMount } from "svelte";
	import { Tabulator } from 'tabulator-tables';
	import 'tabulator-tables/dist/css/tabulator.min.css';

	let webSocketClient: WebSocketClient = $state(WebSocketClient.getInstance());
	let tableContainer: HTMLDivElement | null = $state(null);
	let table: Tabulator | null = $state(null);

	function calculateAnswerSum(playerId: number, answerStatsArray: AnswerStats[]) {
		let answerSum = 0;
		answerStatsArray.forEach((answerStats) => answerSum += (answerStats.userId == playerId && answerStats.isCorrect) ? 1 : 0);
		return answerSum;
	}

	async function createTableData(currentGameStats: GameStats, currentGameAnswerStats: AnswerStats[]) {
		const tableData = [];
		const playerIds = Array.from(new Set(currentGameAnswerStats.map(answer => answer.userId)));
		
		for (const playerId of playerIds) {
			const username = await getUsernameById(playerId);
			const correctAnswers = calculateAnswerSum(playerId, currentGameAnswerStats);
			tableData.push({
				username,
				correctAnswers,
			});
		}
		
		initializeTable(tableData);
	}

	function initializeTable(tableData: any[]) {
		if (tableContainer) {
			table = new Tabulator(tableContainer, {
				data: tableData,
				layout: "fitColumns",
				columns: [
					{ title: "Player", field: "username", width: 150 },
					{ title: "Correct Answers", field: "correctAnswers", width: 150 },
				]
			});
		}
	}

	onMount(async () =>
	{
		await createTableData(await webSocketClient.getCurrentGameStats(), await webSocketClient.getCurrentGameAnswerStats());
	});
</script>



<div bind:this={tableContainer} class="w-full h-96"></div>
