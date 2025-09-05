<script lang="ts">
	import { getAllGamesStats, getAllUsers, getAnswerStatsByGame, getAnswerStreaks, getDictionaryStatsConfig, getDictionaries } from "$lib/databaseTools";
	import { getSettings } from "$lib/globalSettings.svelte";
	import type { AnswerStats, AnswerStreaks, GameStats, User, MedalThreshold, DictionaryInfo } from "$lib/types";
	import WebSocketClient from "$lib/webSocketClient.svelte";
	import { onMount } from "svelte";
	import AutoComplete from "./AutoComplete.svelte";
	import GamesTable from "./GamesTable.svelte";
	import FrequencyHeatmap from "./FrequencyHeatmap.svelte";
	import type { HeatmapData } from "./FrequencyHeatmap.svelte";
	import MedalStats from "./MedalStats.svelte";

	const defaultFrequencyValues: number[] = [];
	const defaultThresholds: MedalThreshold[] = [
		{ value: 0, color: "#gray", points: 0 },
		{ value: 5, color: "#cd7f32", points: 1 },
		{ value: 15, color: "#c0c0c0", points: 2 },
		{ value: 50, color: "#ffd700", points: 3 },
		{ value: 100, color: "#b9f2ff", points: 5 },
	];

	let frequencyValuesX: number[] = $state(defaultFrequencyValues);
	let thresholds: MedalThreshold[] = $state(defaultThresholds);

	let heatmap: ReturnType<typeof FrequencyHeatmap> | null = $state(null);
	let medalStats: ReturnType<typeof MedalStats> | null = $state(null);
	let data: HeatmapData = $state({ axisValues: [], intersectionMatrix: [], streaksData: [] });
	let streaks: (number | null)[][] = $state([]);
	let streaksData: (AnswerStreaks[] | null)[][] = $state([]);

	let users: User[];
	let selectedUser: User | undefined = $state();
	let selectedUserIndex: number = $state(0);
	let usernames: string[] = $state([]);

	let dictionaries: Array<DictionaryInfo> = $state([]);

	async function refreshDictionaries()
	{
		dictionaries = await getDictionaries();
	}

	async function loadStatsConfig()
	{
		const config = await getDictionaryStatsConfig(getSettings().selectedDictionaryId.get());
		if (config) {
			if (config.frequencyValues.length > 0) {
				frequencyValuesX = config.frequencyValues;
			}
			if (config.medals.length > 0) {
				thresholds = config.medals;
			}
		}
	}

	async function getStreaks()
	{
		if (selectedUser == undefined) return;

		const processedValues = [...new Set(frequencyValuesX)]
			.filter(val => val !== 0 && val !== Infinity && !isNaN(val))
			.sort((a, b) => a - b);
		
		const fullFrequencyValues = [0, ...processedValues, Infinity];

		streaks = [];
		streaksData = [];
		for (const min of fullFrequencyValues)
		{
			const row = [];
			const streaksRow = [];
			for (const max of fullFrequencyValues)
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
			axisValues: fullFrequencyValues,
			intersectionMatrix: streaks.map(row => row.map(value => value === null ? 0 : value)),
			streaksData: streaksData,
		};

		await refreshDictionaries();

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		heatmap?.redraw();
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		medalStats?.redraw();
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
		await loadStatsConfig();
		
		users = await getAllUsers();
		selectedUserIndex = users.findIndex(x => x.key == WebSocketClient.getInstance().accountKey) || 0;
		selectedUser = users[selectedUserIndex];

		usernames = users.map((user) =>
		{
			return user.username;
		});

		await redraw();
	});

	$effect(() => {
		getSettings().selectedDictionaryId.get();
		
		void (async () => {
			await loadStatsConfig();
			if (selectedUser) {
				await redraw();
			}
		})();
	});
</script>

<div class="h-full flex flex-col overflow-y-auto">
	{#if selectedUser == undefined}
		<div class="flex items-center justify-center h-full">
			<div class="text-center p-8">
				<div class="text-xl font-semibold text-gray-600 mb-4">
					Statistics unavailable
				</div>
				<div class="text-gray-500">
					Unable to display stats as no games have been played.
				</div>
			</div>
		</div>
	{:else}
		<div class="flex-none relative">
			<div class="absolute left-5 top-5 w-1/4">
				<AutoComplete
					items={dictionaries.map((dictionary: DictionaryInfo) =>
					{
						return dictionary.name;
					})}
					selectedIndex={dictionaries.findIndex((dictionary: DictionaryInfo) =>
					{
						return dictionary.id == getSettings().selectedDictionaryId.get();
					})}
					onSelect={async (selectedIndex: number) =>
					{
						await refreshDictionaries();
						if (selectedIndex == -1)
						{
							getSettings().selectedDictionaryId.set(-1);
						}
						else
						{
							let dictionaryInfo = dictionaries[selectedIndex];
							getSettings().selectedDictionaryId.set(dictionaryInfo.id);
						}
					}}
					disabled={false}
					nullOptionEnabled={true}
				/>
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
				{#await getGameStatsForPlayer(selectedUser.id)}
					Loading games...
				{:then games}
					<GamesTable games={games} />
				{/await}
			</div>
		</div>
	{/if}
</div>
