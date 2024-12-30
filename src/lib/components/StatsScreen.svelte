<script lang="ts">
	import { HeatmapTable, PieChart } from "$lib/charts";
	import { getAnswerStreaks, getStats } from "$lib/databaseTools";
	import { getSettings } from "$lib/globalSettings.svelte";
	import type { StatsInfo } from "$lib/types";
	import WebSocketClient from "$lib/webSocketClient.svelte";
	import * as d3 from "d3";
	import { onMount } from "svelte";

	const frequencyValuesX = [0, 1000, 2500, 5000, 7500, 10000, 15000, 20000, 30000, 50000, 100000];
	let stats: StatsInfo = $state({ correctCount: 0, wrongCount: 0 });
	let answersDiv: HTMLElement;
	let streaksDiv: HTMLElement;
	let streaks: (number | null)[][] = $state([]);

	function drawAnswerChart()
	{
		const data = [
			{ name: `correct`, value: stats.correctCount },
			{ name: `wrong`, value: stats.wrongCount },
		];
		const colors = {
			correct: `darkgreen`,
			wrong: `darkred`,
		};
		const chart = new PieChart(answersDiv, data);
		chart.colors = colors;
		chart.draw();
	}

	function drawStreaksTable()
	{
		const tableData = {
			axisValues: frequencyValuesX,
			intersectionMatrix: streaks.map(row => row.map(value => value === null ? 0 : value)),
		};
		const table = new HeatmapTable(streaksDiv, tableData);
		table.width = 800;
		table.height = 800;
		table.thresholds = [
			{ value: 0, color: "#gray" },
			{ value: 5, color: "#cd7f32" },
			{ value: 10, color: "#c0c0c0" },
			{ value: 50, color: "#ffd700" },
			{ value: 100, color: "#b9f2ff" },
		];
		table.draw();
	}

	async function getStreaks()
	{
		streaks = [];
		for (const min of frequencyValuesX)
		{
			const row = [];
			for (const max of frequencyValuesX)
			{
				if (min >= max)
				{
					row.push(null);
				}
				else
				{
					const streak = await getAnswerStreaks(min, max, 1, WebSocketClient.getInstance().accountKey, WebSocketClient.getInstance().accountName);
					row.push(streak.length > 0 ? streak[0].length : 0);
				}
			}
			streaks.push(row);
		}
		drawStreaksTable();
	}

	onMount(async () =>
	{
		stats = await getStats();
		drawAnswerChart();
		await getStreaks();
	});
</script>

<div>
	<div class="w-36 h-36 m-5" bind:this={answersDiv}></div>
	<div class="w-full max-w-[1000px]" bind:this={streaksDiv}></div>
</div>
