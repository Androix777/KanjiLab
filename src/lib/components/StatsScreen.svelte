<script lang="ts">
	import { PieChart } from "$lib/charts";
	import { getAnswerStreaks, getStats } from "$lib/databaseTools";
	import type { StatsInfo } from "$lib/types";
	import { onMount } from "svelte";

	const frequencyValuesX = [0, 1000, 5000, 10000, 15000, 20000, 30000, 50000, 100000];
	let stats: StatsInfo = $state({ correctCount: 0, wrongCount: 0 });
	let answersDiv: HTMLElement;
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
					const streak = await getAnswerStreaks(min, max, 1);
					row.push(streak.length > 0 ? streak[0].length : 0);
				}
			}
			streaks.push(row);
		}
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
	<table class="table text-lg">
		<tbody>
			<tr>
				<th>MIN / MAX</th>
				{#each frequencyValuesX as yValue, i}
					{#if i != 0}
						<th>{yValue}</th>
					{/if}
				{/each}
			</tr>
			{#each frequencyValuesX as xValue, i}
				<tr>
					<th>{xValue}</th>
					{#each streaks[i] as streak, j}
						{#if j != 0}
							<td>{streak ?? `-`}</td>
						{/if}
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
