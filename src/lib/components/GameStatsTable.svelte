<script lang="ts">
	import { getUserdataById } from "$lib/databaseTools";
	import type { AnswerStats, GameStats } from "$lib/types";
	import { onMount } from "svelte";
	import { TabulatorFull as Tabulator } from "tabulator-tables";
	import type { CellComponent, ColumnDefinition } from "tabulator-tables";
	import "tabulator-tables/dist/css/tabulator.min.css";

	type Props = {
		gameStats: GameStats;
		gameAnswerStats: AnswerStats[];
	};

	const {
		gameStats,
		gameAnswerStats,
	}: Props = $props();

	let tableContainer: HTMLDivElement | null = $state(null);

	type AnswerCell = {
		answer: string;
		isCorrect: boolean;
	};
	type TableRow = {
		question: string;
		[key: number]: AnswerCell;
	};

	async function createTableData(gameStats: GameStats, gameAnswerStats: AnswerStats[])
	{
		const playerIds = Array.from(new Set(gameAnswerStats.map(answer => answer.userId)));

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
					const value: AnswerCell = cell.getValue() as AnswerCell;
					return `<div class="absolute right-0 left-0 top-0 bottom-0 z-0 ${
						value.isCorrect ? `bg-success` : `bg-error`
					} bg-opacity-40"></div><div class="z-10 fixed">${value.answer}</div>`;
				},
			});
		});

		const rows: TableRow[] = [];
		players.forEach(player =>
		{
			let rowId = 0;
			gameAnswerStats.forEach(answerStats =>
			{
				if (answerStats.userId == player.id)
				{
					if (rows.length <= rowId)
					{
						rows[rowId] = {
							question: answerStats.word,
						};
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

	function initializeTable(tableData: TableRow[], columns: ColumnDefinition[])
	{
		if (tableContainer)
		{
			new Tabulator(tableContainer, {
				data: tableData,
				layout: "fitColumns",
				columns,
			});
		}
	}

	onMount(async () =>
	{
		await createTableData(gameStats, gameAnswerStats);
	});
</script>

<style>
	* :global(.tabulator) {
	  background-color: var(--fallback-b2, oklch(var(--b2) / var(--tw-bg-opacity)));
	}
	* :global(.tabulator-header) {
	  background-color: var(--fallback-b1, oklch(var(--b1) / var(--tw-bg-opacity)));
	}
	* :global(.tabulator-row) {
	  background-color: var(--fallback-b1, oklch(var(--b1) / var(--tw-bg-opacity)));
	  color: var(--fallback-bc, oklch(var(--bc) / var(--tw-bg-opacity)));
	}
	* :global(.tabulator-cell) {
	  border: 1px solid var(--fallback-b3, oklch(var(--b3) / var(--tw-bg-opacity)));
	  overflow: hidden;
	}
	* :global(.tabulator-col) {
	  background-color: var(--fallback-b1, oklch(var(--b1) / var(--tw-bg-opacity))) !important;
	  color: var(--fallback-bc, oklch(var(--bc) / var(--tw-bg-opacity)));
	}
	* :global(.tabulator-row.tabulator-selectable:hover) {
	  background-color: var(--fallback-b3, oklch(var(--b3) / var(--tw-bg-opacity)));
	}
</style>
<div>
	<div bind:this={tableContainer} class="w-full h-96 bg-base-content"></div>
</div>
