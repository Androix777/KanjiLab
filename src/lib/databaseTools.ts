import { getSettings } from "$lib/globalSettings.svelte";
import type { AnswerStats, AnswerStreaks, DictionaryInfo, DictionaryStatsConfig, GameStats, RawDictionaryInfo, User, WordInfo } from "$lib/types";
import type { StatsInfo } from "$lib/types";
import { invoke } from "@tauri-apps/api/core";

export const getRandomWord = (() =>
{
	const FIRST_BATCH_SIZE = 1;
	const HIGH_MARK = 10;
	const LOW_MARK = 5;

	let cache: WordInfo[] = [];
	let lastSettingsKey: string | null = null;
	let inFlight: Promise<void> | null = null;

	const collectSettings = () => ({
		minFrequency: getSettings().minFrequency.get(),
		maxFrequency: getSettings().usingMaxFrequency.get() ?
			getSettings().maxFrequency.get() :
			null,
		wordPart: getSettings().wordPart.get() || null,
		wordPartReading: getSettings().wordPartReading.get() || null,
		dictionaryId: getSettings().selectedDictionaryId.get(),
		examplesCount: 5,
	} as const);

	const fetchBatch = async (settings: ReturnType<typeof collectSettings>, count: number) =>
	{
		const words: WordInfo[] = await invoke("get_words", {
			...settings,
			count,
		});
		cache.push(...words);
	};

	const ensurePrefetch = (settings: ReturnType<typeof collectSettings>) =>
	{
		if (inFlight || cache.length >= HIGH_MARK) return;

		const need = HIGH_MARK - cache.length;
		inFlight = fetchBatch(settings, need)
			.finally(() =>
			{
				inFlight = null;
			});
	};

	return async function getRandomWord(): Promise<WordInfo>
	{
		const settings = collectSettings();
		const settingsKey = JSON.stringify(settings);

		if (settingsKey !== lastSettingsKey)
		{
			cache = [];
			lastSettingsKey = settingsKey;
		}

		if (cache.length === 0)
		{
			if (!inFlight)
			{
				inFlight = fetchBatch(settings, FIRST_BATCH_SIZE)
					.finally(() =>
					{
						inFlight = null;
					});
			}
			await inFlight;
			ensurePrefetch(settings);
		}
		else if (cache.length < LOW_MARK)
		{
			ensurePrefetch(settings);
		}

		const idx = Math.floor(Math.random() * cache.length);
		const [word] = cache.splice(idx, 1);
		return word;
	};
})();

export async function getWordsCount(): Promise<number>
{
	const data: number = await invoke("get_words_count", {
		minFrequency: getSettings().minFrequency.get(),
		maxFrequency: getSettings().usingMaxFrequency.get() ? getSettings().maxFrequency.get() : null,
		wordPart: getSettings().wordPart.get() == `` ? null : getSettings().wordPart.get(),
		wordPartReading: getSettings().wordPartReading.get() == `` ? null : getSettings().wordPartReading.get(),
		dictionaryId: getSettings().selectedDictionaryId.get(),
	});

	return data;
}

export async function getFontId(name: string): Promise<number>
{
	return await invoke("get_font_id", {
		name: name,
	});
}

export async function addAnswerStats(
	gameStatsId: number,
	userKey: string,
	userName: string,
	word: string,
	wordReading: string,
	duration: number | null,
	isCorrect: boolean,
	roundIndex: number,
	fontId: number,
): Promise<void>
{
	await invoke("add_answer_stats", {
		gameStatsId: gameStatsId,
		userKey: userKey,
		userName: userName,
		word: word,
		wordReading: wordReading,
		duration: duration,
		isCorrect: isCorrect,
		roundIndex: roundIndex,
		fontId: fontId,
	});
}

export async function addGameStats(
	roundsCount: number,
	roundDuration: number,
	minFrequency: number,
	maxFrequency: number | null,
	wordPart: string | null,
	wordPartReading: string | null,
	fontId: number | null,
	dictionaryId: number,
): Promise<number>
{
	const index: number = await invoke("add_game_stats", {
		roundsCount: roundsCount,
		roundDuration: roundDuration,
		minFrequency: minFrequency,
		maxFrequency: maxFrequency,
		wordPart: wordPart,
		wordPartReading: wordPartReading,
		fontId: fontId,
		dictionaryId: dictionaryId,
	});

	return index;
}

export async function getOverallStats(userKey: string, dictionaryId: number): Promise<StatsInfo>
{
	const data: StatsInfo = await invoke("get_overall_stats", {
		userKey: userKey,
		dictionaryId: dictionaryId,
	});
	return data;
}

export async function getAnswerStreaks(
	minFrequency: number,
	maxFrequency: number | null,
	count: number,
	userKey: string,
	dictionaryId: number,
): Promise<AnswerStreaks[]>
{
	const data: AnswerStreaks[] = await invoke("get_answer_streaks", {
		minFrequency: minFrequency,
		maxFrequency: maxFrequency,
		count: count,
		userKey: userKey,
		dictionaryId: dictionaryId,
	});
	return data;
}

export async function getWordParts(dictionaryId: number): Promise<string[]>
{
	const data: string[] = await invoke("get_word_parts", {
		dictionaryId: dictionaryId,
	});
	return data;
}

export async function getWordPartReadings(wordPart: string, dictionaryId: number): Promise<string[]>
{
	const data: string[] = await invoke("get_word_part_readings", {
		wordPart: wordPart,
		dictionaryId: dictionaryId,
	});
	return data;
}

export async function getAllGamesStats(dictionaryId: number): Promise<GameStats[]>
{
	const data: GameStats[] = await invoke("get_all_games_stats", {
		dictionaryId: dictionaryId,
	});
	return data;
}

export async function getGameStats(id: number): Promise<GameStats>
{
	const data: GameStats = await invoke("get_game_stats", { id });
	return data;
}

export async function getAnswerStatsByGame(gameStatsId: number): Promise<AnswerStats[]>
{
	const data: AnswerStats[] = await invoke("get_answer_stats_by_game", { gameStatsId });
	return data;
}

export async function getAllAnswerStats(dictionaryId: number): Promise<AnswerStats[]>
{
	const data: AnswerStats[] = await invoke("get_all_answer_stats", {
		dictionaryId: dictionaryId,
	});
	return data;
}

export async function getUserdataById(userId: number): Promise<User>
{
	const userdata: User = await invoke("get_userdata_by_id", { userId });
	return userdata;
}

export async function getAllUsers(): Promise<User[]>
{
	const users: User[] = await invoke("get_all_users");
	return users;
}

export async function getDictionaries(): Promise<DictionaryInfo[]>
{
	const rawDictionaries: RawDictionaryInfo[] = await invoke("get_dictionaries");
	
	return rawDictionaries.map(dict => ({
		...dict,
		statsConfig: dict.statsConfig ?
			(() => {
				try {
					return JSON.parse(dict.statsConfig) as DictionaryStatsConfig;
				} catch (error) {
					console.error("Failed to parse stats config for dictionary", dict.id, error);
					return null;
				}
			})() : null
	}));
}

export async function getDictionaryStatsConfig(dictionaryId: number): Promise<DictionaryStatsConfig | null>
{
	const dictionaries = await getDictionaries();
	const dictionary = dictionaries.find(d => d.id === dictionaryId);
	
	return dictionary?.statsConfig || null;
}

export async function deleteDictionary(id: number): Promise<void>
{
	const x = await invoke("delete_dictionary", { id });
	console.log(x);
}

export async function importDictionary(dictPath: string): Promise<void>
{
	const x = await invoke("import_dictionary", { dictPath });
	console.log(x);
}

export async function updateCardFsrs(
	word: string,
	isCorrect: boolean,
): Promise<void>
{
	await invoke("update_card_fsrs", {
		word: word,
		isCorrect: isCorrect,
	});
}
