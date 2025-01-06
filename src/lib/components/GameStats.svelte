<script lang="ts">
	import { getUserdataById } from "$lib/databaseTools";
	import type { AnswerStats, GameStats } from "$lib/types";
	import WebSocketClient from "$lib/webSocketClient.svelte";
	import { onMount } from "svelte";
	import { TabulatorFull as Tabulator } from "tabulator-tables";
	import type { CellComponent, ColumnDefinition } from "tabulator-tables";
	import "tabulator-tables/dist/css/tabulator.min.css";

	let webSocketClient: WebSocketClient = $state(WebSocketClient.getInstance());
	let tableContainer: HTMLDivElement | null = $state(null);
	let table: Tabulator | null = $state(null);

	async function createTableData(currentGameStats: GameStats, currentGameAnswerStats: AnswerStats[])
	{
		const playerIds = Array.from(new Set(currentGameAnswerStats.map(answer => answer.userId)));

		const players = await Promise.all(playerIds.map(async (playerId) => ({
			id: playerId,
			userdata: await getUserdataById(playerId),
		})));

		const columns: ColumnDefinition[] = [
			{ title: "Question", field: "question", width: 200, frozen: true },
		];

		players.forEach(player =>
		{
			columns.push({
				title: player.userdata.username,
				field: `${player.id}`,
				width: 150,
				formatter: (cell: CellComponent) =>
				{
					const value = cell.getValue();
					if (!value) return "";
					return `<div class="${value.isCorrect ? "bg-green-100" : "bg-red-100"}">${value.answer}</div>`;
				},
			});
		});

		const rows: any[] = [];
		players.forEach(player =>
		{
			let rowId = 0;
			currentGameAnswerStats.forEach(answerStats =>
			{
				if (answerStats.userId == player.id)
				{
					if (rows.length <= rowId)
					{
						rows[rowId] = { question: answerStats.word };
					}
					rows[rowId][player.id] = {
						answer: answerStats.wordReading == "" ? "　" : answerStats.wordReading,
						isCorrect: answerStats.isCorrect,
					};
					rowId++;
				}
			});
		});

		initializeTable(rows, columns);
	}

	function initializeTable(tableData: any[], columns: any[])
	{
		if (tableContainer)
		{
			table = new Tabulator(tableContainer, {
				data: tableData,
				layout: "fitColumns",
				columns,
			});
		}
	}

	onMount(async () =>
	{
		await createTableData(await webSocketClient.getCurrentGameStats(), await webSocketClient.getCurrentGameAnswerStats());
	});
</script>

<div bind:this={tableContainer} class="w-full h-96"></div>
