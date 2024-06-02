<script lang="ts">
	import DatabaseService from "$lib/databaseService";
    import type { StatsInfo } from "$lib/types";
    import { onMount } from "svelte";
	import { PieChart } from "$lib/charts";

	let stats: StatsInfo = $state({ correctCount: 0, wrongCount: 0 });
	let answersDiv: HTMLElement;

	async function getStats()
	{
		const databaseService = await DatabaseService.getInstance();
		stats = await databaseService.getStats();
	}

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

	onMount(async () =>
	{
		await getStats();
		drawAnswerChart();
	});
</script>

<div>
	<div class="w-36 h-36 m-5" bind:this={answersDiv}>
	</div>
</div>
