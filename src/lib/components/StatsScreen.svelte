<script lang="ts">
	import { getAllGamesStats, getAllUsers, getAnswerStatsByGame, getAnswerStreaks } from "$lib/databaseTools";
	import type { AnswerStats, GameStats, User } from "$lib/types";
	import WebSocketClient from "$lib/webSocketClient.svelte";
	import { onMount } from "svelte";
	import AutoComplete from "./AutoComplete.svelte";
	import GamesTable from "./GamesTable.svelte";
	import Heatmap from "./Heatmap.svelte";
	import type { HeatmapData } from "./Heatmap.svelte";
	import MedalStats from "./MedalStats.svelte";

	const frequencyValuesX = [0, 1000, 2500, 5000, 7500, 10000, 15000, 20000, 30000, 50000, 100000];
	const thresholds = [
		{ value: 0, color: "#gray", points: 0 },
		{ value: 5, color: "#cd7f32", points: 1 },
		{ value: 10, color: "#c0c0c0", points: 2 },
		{ value: 25, color: "#ffd700", points: 3 },
		{ value: 100, color: "#b9f2ff", points: 5 },
	];

	let heatmap: ReturnType<typeof Heatmap>;
	let medalStats: ReturnType<typeof MedalStats>;
	let data: HeatmapData = $state({ axisValues: [], intersectionMatrix: [] });
	let streaks: (number | null)[][] = $state([]);

	let users: User[];
	let selectedUser: User | undefined = $state();
	let selectedUserIndex: number = $state(0);
	let usernames: string[] = $state([]);

	async function getStreaks()
	{
		if (selectedUser == undefined) return;

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

		data = {
			axisValues: frequencyValuesX,
			intersectionMatrix: streaks.map(row => row.map(value => value === null ? 0 : value)),
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		heatmap.redraw();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		medalStats.redraw();
	}

	async function redraw()
	{
		await getStreaks();
	}

	async function getGameStatsForPlayer(playerId: number)
	{
		const games: GameStats[] = await getAllGamesStats();
		const filteredGames: GameStats[] = [];
		for (let i = 0; i < games.length; i++)
		{
			let gameAnswerStats: AnswerStats[] = await getAnswerStatsByGame(games[i].id);
			if (gameAnswerStats.find((answerStats) => answerStats.userId == playerId) != undefined)
			{
				filteredGames.push(games[i]);
			}
		}
		return filteredGames;
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

<div class="h-full overflow-y-scroll">
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
	</div>
	<MedalStats
		bind:this={medalStats}
		data={data}
		thresholds={thresholds}
	/>
	<div class="flex flex-row w-full overflow-hidden">
		<div class="flex-none w-1/2">
			<Heatmap
				bind:this={heatmap}
				data={data}
				width={800}
				height={800}
				thresholds={thresholds}
			/>
		</div>

		<div class="w-1/2 p-4 pt-10" style="min-height: 85%">
			{#if selectedUser != undefined}
				{#await getGameStatsForPlayer(selectedUser.id)}
					Loading games...
				{:then games}
					<GamesTable games={games} />
				{/await}
			{/if}
		</div>
	</div>
</div>
