<script lang="ts">
	import DatabaseService from "$lib/databaseService";
    import type { StatsInfo } from "$lib/types";
    import { onMount } from "svelte";
	import { addPieChart } from "$lib/charts";

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
		const colorDict = {
			correct: `darkgreen`,
			wrong: `darkred`,
		};
		addPieChart(answersDiv, data, colorDict);
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
	Answers {stats.correctCount + stats.wrongCount} / {stats.correctCount} / {stats.wrongCount}
</div>
