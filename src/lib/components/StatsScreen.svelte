<script lang="ts">
	import { getAllGamesStats, getAllUsers, getAnswerStatsByGame, getAnswerStreaks } from "$lib/databaseTools";
	import { getSettings } from "$lib/globalSettings.svelte";
	import type { AnswerStats, AnswerStreaks, GameStats, User } from "$lib/types";
	import WebSocketClient from "$lib/webSocketClient.svelte";
	import { onMount } from "svelte";
	import AutoComplete from "./AutoComplete.svelte";
	import GamesTable from "./GamesTable.svelte";
	import FrequencyHeatmap from "./FrequencyHeatmap.svelte";
	import type { HeatmapData } from "./FrequencyHeatmap.svelte";
	import MedalStats from "./MedalStats.svelte";

	const frequencyValuesX = [0, 1000, 2500, 5000, 7500, 10000, 15000, 20000, 30000, 50000, 100000, Infinity];
	const thresholds = [
		{ value: 0, color: "#gray", points: 0 },
		{ value: 5, color: "#cd7f32", points: 1 },
		{ value: 15, color: "#c0c0c0", points: 2 },
		{ value: 50, color: "#ffd700", points: 3 },
		{ value: 100, color: "#b9f2ff", points: 5 },
	];

	let heatmap: ReturnType<typeof FrequencyHeatmap>;
	let medalStats: ReturnType<typeof MedalStats>;
	let data: HeatmapData = $state({ axisValues: [], intersectionMatrix: [], streaksData: [] });
	let streaks: (number | null)[][] = $state([]);
	let streaksData: (AnswerStreaks[] | null)[][] = $state([]);

	let users: User[];
	let selectedUser: User | undefined = $state();
	let selectedUserIndex: number = $state(0);
	let usernames: string[] = $state([]);

	async function getStreaks()
	{
		if (selectedUser == undefined) return;

		streaks = [];
		streaksData = [];
		for (const min of frequencyValuesX)
		{
			const row = [];
			const streaksRow = [];
			for (const max of frequencyValuesX)
			{
				if (min >= max)
				{
					row.push(null);
					streaksRow.push(null);
				}
				else
				{
					const maxValue = max === Infinity ? null : max;
					const streak = await getAnswerStreaks(min, maxValue, 5, selectedUser.key, getSettings().selectedDictionaryId.get());
					row.push(streak.length > 0 ? streak[0].length : 0);
					streaksRow.push(streak);
				}
			}
			streaks.push(row);
			streaksData.push(streaksRow);
		}

		data = {
			axisValues: frequencyValuesX,
			intersectionMatrix: streaks.map(row => row.map(value => value === null ? 0 : value)),
			streaksData: streaksData,
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
		const games: GameStats[] = await getAllGamesStats(getSettings().selectedDictionaryId.get());
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

<div class="h-full flex flex-col overflow-y-auto">
	<div class="flex-none relative">
		<div class="absolute left-5 top-10 w-1/4">
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
	</div>
	<div class="grid grid-cols-2 lg:flex lg:flex-row w-full overflow-hidden flex-grow" style="min-height: min-content">
		<div class="h-full col-span-2 aspect-square lg:flex-none lg:max-w-[50%]">
			<FrequencyHeatmap
				bind:this={heatmap}
				data={data}
				thresholds={thresholds}
			/>
		</div>

		<div class="p-4 pt-10 col-span-2 min-w-0 min-h-full max-h-[50%] lg:flex-grow lg:max-h-full lg:min-h-[85%]">
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
