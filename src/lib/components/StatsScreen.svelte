<script lang="ts">
	import { HeatmapTable, PieChart } from "$lib/charts";
	import { getAllUsers, getAnswerStreaks, getOverallStats } from "$lib/databaseTools";
	import type { StatsInfo, User } from "$lib/types";
	import WebSocketClient from "$lib/webSocketClient.svelte";
	import { onMount } from "svelte";
	import AutoComplete from "./AutoComplete.svelte";

	let answerChart: PieChart | null;
	let streaksTable: HeatmapTable | null;

	const frequencyValuesX = [0, 1000, 2500, 5000, 7500, 10000, 15000, 20000, 30000, 50000, 100000];
	let stats: StatsInfo = $state({ correctCount: 0, wrongCount: 0 });
	let answersDiv: HTMLElement;
	let streaksDiv: HTMLElement;
	let streaks: (number | null)[][] = $state([]);
	let users: User[];
	let selectedUser: User;
	let selectedUserIndex: number = $state(0);
	let usernames: string[] = $state([]);

	async function drawAnswerChart()
	{
		if (answerChart)
		{
			answerChart.remove();
			answerChart = null;
		}

		stats = await getOverallStats(selectedUser.key);

		const data = [
			{ name: `correct`, value: stats.correctCount },
			{ name: `wrong`, value: stats.wrongCount },
		];
		const colors = {
			correct: `darkgreen`,
			wrong: `darkred`,
		};
		answerChart = new PieChart(answersDiv, data);
		answerChart.colors = colors;
		answerChart.draw();
	}

	function drawStreaksTable()
	{
		if (streaksTable)
		{
			streaksTable.remove();
			streaksTable = null;
		}

		const tableData = {
			axisValues: frequencyValuesX,
			intersectionMatrix: streaks.map(row => row.map(value => value === null ? 0 : value)),
		};
		streaksTable = new HeatmapTable(streaksDiv, tableData);
		streaksTable.width = 800;
		streaksTable.height = 800;
		streaksTable.thresholds = [
			{ value: 0, color: "#gray" },
			{ value: 5, color: "#cd7f32" },
			{ value: 10, color: "#c0c0c0" },
			{ value: 50, color: "#ffd700" },
			{ value: 100, color: "#b9f2ff" },
		];
		streaksTable.draw();
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
					const streak = await getAnswerStreaks(min, max, 1, selectedUser.key);
					row.push(streak.length > 0 ? streak[0].length : 0);
				}
			}
			streaks.push(row);
		}
		drawStreaksTable();
	}

	async function redraw()
	{
		await drawAnswerChart();
		await getStreaks();
	}

	onMount(async () =>
	{
		users = await getAllUsers();
		selectedUserIndex = users.findIndex(x => x.key == WebSocketClient.getInstance().accountKey) || 0;
		selectedUser = users[selectedUserIndex];

		usernames = users.map((user) =>
		{
			return user.username;
		});

		await redraw();
	});
</script>

<div>
	<AutoComplete
		items={usernames}
		selectedIndex={selectedUserIndex}
		maxOptions={10}
		onSelect={async (selectedIndex: number) =>
		{
			selectedUserIndex = selectedIndex;
			selectedUser = users[selectedUserIndex];
			await redraw();
		}}
	/>
	<div class="w-36 h-36 m-5" bind:this={answersDiv}></div>
	<div class="w-full max-w-[1000px]" bind:this={streaksDiv}></div>
</div>
