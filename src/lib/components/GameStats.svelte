<script lang="ts">
	import { getUsernameById } from "$lib/databaseTools";
	import type { AnswerStats, GameStats } from "$lib/types";
	import WebSocketClient from "$lib/webSocketClient.svelte";
    import { onMount } from "svelte";
	import { TabulatorFull as Tabulator } from 'tabulator-tables';
	import type { ColumnDefinition, CellComponent } from 'tabulator-tables';
	import 'tabulator-tables/dist/css/tabulator.min.css';

	let webSocketClient: WebSocketClient = $state(WebSocketClient.getInstance());
	let tableContainer: HTMLDivElement | null = $state(null);
	let table: Tabulator | null = $state(null);

	async function createTableData(currentGameStats: GameStats, currentGameAnswerStats: AnswerStats[]) {
		const tableData: any[] = [];
		const playerIds = Array.from(new Set(currentGameAnswerStats.map(answer => answer.userId)));
		const questions = Array.from(new Set(currentGameAnswerStats.map(answer => answer.word)));
		
		const players = await Promise.all(playerIds.map(async (playerId) => ({
			id: playerId,
			username: await getUsernameById(playerId)
		})));
		
		const columns: ColumnDefinition[] = [
			{ title: "Question", field: "question", width: 200, frozen: true }
		];
		
		players.forEach(player => {
			columns.push({
				title: player.username,
				field: `${player.id}`,
				width: 150,
				formatter: (cell: CellComponent) => {
					const value = cell.getValue();
					if (!value) return '';
					return `<div class="${
						value.isCorrect ? 'bg-green-100' : 'bg-red-100'
					}">${value.answer}</div>`;
				}
			});
		});
		
		questions.forEach(question => {
			const row: any = { question };
			const questionAnswers = currentGameAnswerStats.filter(a => a.word === question);
			
			players.forEach(player => {
				const answer = questionAnswers.find(a => a.userId === player.id);
				row[`${player.id}`] = answer ? {
					answer: answer.wordReading,
					isCorrect: answer.isCorrect
				} : null;
			});
			
			tableData.push(row);
		});
		
		initializeTable(tableData, columns);
	}

	function initializeTable(tableData: any[], columns: any[]) {
		if (tableContainer) {
			table = new Tabulator(tableContainer, {
				data: tableData,
				layout: "fitColumns",
				columns
			});
		}
	}

	onMount(async () =>
	{
		await createTableData(await webSocketClient.getCurrentGameStats(), await webSocketClient.getCurrentGameAnswerStats());
	});
</script>



<div bind:this={tableContainer} class="w-full h-96"></div>
