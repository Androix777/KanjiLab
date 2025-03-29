<script lang="ts">
	import type { AnswerStats, GameStats } from "$lib/types";
	import { onMount } from "svelte";
	import { TabulatorFull as Tabulator } from "tabulator-tables";
	import type { ColumnDefinition } from "tabulator-tables";
	import "tabulator-tables/dist/css/tabulator.min.css";
	import { getAnswerStatsByGame } from "$lib/databaseTools";
	import GameStatsTable from "./GameStatsTable.svelte";

	type Props = {
		games: GameStats[];
	};

	const {
		games,
	}: Props = $props();

	let tableContainer: HTMLDivElement | null = $state(null);
	let fontsModal: HTMLDialogElement;
	let selectedGameStats: GameStats = $state(games[0]);
	let selectedGameAnswerStats: AnswerStats[] = $state([]);

	type TableRow = {
		id: number;
		dictionary: string;
		font: string;
		maxFrequency: number;
		minFrequency: number;
		roundDuration: number;
		roundsCount: number;
	};

	function createTableData(games: GameStats[])
	{
		const rows: TableRow[] = [];
		games.forEach((game) =>
		{
			let row: TableRow = {
				id: game.id,
				dictionary: game.dictionary,
				font: (typeof (game.font) == typeof ("") ? game.font as string : ""),
				maxFrequency: (typeof (game.maxFrequency) == typeof (0) ? game.maxFrequency as number : -1),
				minFrequency: game.minFrequency,
				roundDuration: game.roundDuration,
				roundsCount: game.roundsCount,
			};

			rows.push(row);
		});

		const columns: ColumnDefinition[] = [
			{ title: "ID", field: "id", width: 50 },
			{ title: "Dictionary", field: "dictionary", width: 200 },
			{ title: "Font", field: "font", width: 200 },
			{ title: "Max frequency", field: "maxFrequency", width: 200 },
			{ title: "Min frequency", field: "minFrequency", width: 200 },
			{ title: "Round duration", field: "roundDuration", width: 200 },
			{ title: "Number of rounds", field: "roundsCount", width: 200 },
		];

		rows.reverse();

		initializeTable(rows, columns);
	}

	function initializeTable(tableData: TableRow[], columns: ColumnDefinition[])
	{
		if (tableContainer)
		{
			let table = new Tabulator(tableContainer, {
				data: tableData,
				layout: "fitColumns",
				columns,
			});
			table.on("rowClick", async function(e, row)
			{
				let gameStats: GameStats | undefined = games.find((game) => game.id == row.getData().id);
				if (gameStats != undefined)
				{
					selectedGameStats = gameStats;
					selectedGameAnswerStats = await getAnswerStatsByGame(gameStats.id);
					fontsModal.showModal();
				}
			});
		}
	}

	onMount(() =>
	{
		createTableData(games);
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
	<dialog
		bind:this={fontsModal}
		class="h-screen w-screen rounded-md bg-black bg-opacity-50"
		style="min-height: 200vh; min-width: 200vw; margin-left: -50vw"
	>
		<form method="dialog">
			<button
				aria-label="modal-bg"
				class="absolute top-0 left-0 hover:cursor-default"
				style="min-height: 200vh; min-width: 200vw; margin-left: -50vw"
			></button>
		</form>
		<div class="h-full w-full flex justify-center items-center">
			<div class="p-4">
				<div class="flex flex-column justify-center items-center">
					<div class="card card-bordered bg-base-100 shadow-xl p-4 flex-1" style="height: 80vh; width: 80vw">
						<div class="card-title mb-4" style="height: 10%;">Game stats</div>
						<div style="height: 90%;">
							<GameStatsTable
								gameStats={selectedGameStats}
								gameAnswerStats={selectedGameAnswerStats}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</dialog>
</div>
