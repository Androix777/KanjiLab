<script lang="ts">
	import type { AnswerStats, GameStats } from "$lib/types";
	import { onMount } from "svelte";
	import { TabulatorFull as Tabulator } from "tabulator-tables";
	import "tabulator-tables/dist/css/tabulator.min.css";
	import { getAnswerStatsByGame } from "$lib/databaseTools";
	import { getSettings } from "$lib/globalSettings.svelte";
	import type { CellComponent, ColumnDefinition } from "tabulator-tables";
	import GameStatsTable from "./GameStatsTable.svelte";

	type Props = {
		games: GameStats[];
	};

	const {
		games,
	}: Props = $props();

	let table: Tabulator | null = $state(null);
	let tableContainer: HTMLDivElement | null = $state(null);
	let tableColumns: Array<ColumnState> = $state([]);
	let fontsModal: HTMLDialogElement;
	let selectedGameStats: GameStats = $state(games[0]);
	let selectedGameAnswerStats: AnswerStats[] = $state([]);

	type TableRow = {
		id: number;
		dictionary: string;
		font: string;
		maxFrequency: number | null;
		minFrequency: number;
		roundDuration: number;
		roundsCount: number;
		realRoundsCount: number;
		usersCount: number;
		timestamp: string;
	};

	type ColumnState = {
		definition: ColumnDefinition;
		state: boolean;
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
				maxFrequency: game.maxFrequency,
				minFrequency: game.minFrequency,
				roundDuration: game.roundDuration,
				roundsCount: game.roundsCount,
				realRoundsCount: game.realRoundsCount,
				usersCount: game.usersCount,
				timestamp: game.timestamp,
			};

			rows.push(row);
		});

		const columns: ColumnDefinition[] = [
			{ title: "ID", field: "id", width: 50 },
			{ title: "Dictionary", field: "dictionary", width: 100 },
			{ title: "Font", field: "font", width: 100 },
			{ title: "Min frequency", field: "minFrequency", width: 100 },
			{
				title: "Max frequency",
				field: "maxFrequency",
				width: 100,
				formatter: (
					cell: CellComponent,
				): string =>
				{
					const value = cell.getValue() as number | null;
					return value == null ? "∞" : String(value);
				},
				sorter: (
					a: number | null,
					b: number | null,
				): number =>
				{
					const toNum = (v: number | null) => v == null ? Number.POSITIVE_INFINITY : v;
					return toNum(a) - toNum(b);
				},
			},
			{ title: "Round duration", field: "roundDuration", width: 100 },
			{ title: "Number of rounds", field: "roundsCount", width: 100 },
			{ title: "Rounds", field: "realRoundsCount", width: 100 },
			{ title: "Users", field: "usersCount", width: 100 },
			{ title: "Time", field: "timestamp", width: 100 },
		];

		rows.reverse();

		initializeTable(rows, columns);
	}

	function initializeTable(tableData: TableRow[], columns: ColumnDefinition[])
	{
		columns.forEach((column) =>
		{
			if (column.field)
			{
				tableColumns.push({ definition: column, state: (getSettings().toggledColumns.get().includes(column.field)) });
				column.visible = getSettings().toggledColumns.get().includes(column.field);
			}
		});

		if (tableContainer)
		{
			table = new Tabulator(tableContainer, {
				data: tableData,
				layout: "fitColumns",
				height: tableContainer.clientHeight,
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

<div class="w-full h-full bg-base-content relative">
	{#if table != null}
		<div class="absolute -top-7 left-0 z-10 dropdown">
			<div tabindex="0" role="button" class="btn btn-xs">...</div>
			<div class="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
				{#each tableColumns as tableColumn}
					<div class="flex flex-row m-1">
						<input
							type="checkbox"
							class="checkbox checkbox-xs"
							bind:checked={tableColumn.state}
							onchange={() =>
							{
								if (table != null && tableColumn.definition.field != null)
								{
									table.getColumns().find((column) => column.getDefinition().field == tableColumn.definition.field)?.toggle();
									let toggledColumns: Array<string> = getSettings().toggledColumns.get();
									if (toggledColumns.find((toggledColumn) => toggledColumn == tableColumn.definition.field) != null)
									{
										toggledColumns = toggledColumns.filter((toggledColumn) => toggledColumn != tableColumn.definition.field);
									}
									else
									{
										toggledColumns.push(tableColumn.definition.field);
									}
									getSettings().toggledColumns.set(toggledColumns);
								}
							}}
						/>
						<div class="flex-grow text-center">{tableColumn.definition.title}</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
	<div class="h-full" bind:this={tableContainer}></div>
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
						<div class="card-title mb-4" style="height: 10%">Game stats</div>
						<div style="height: 90%">
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
