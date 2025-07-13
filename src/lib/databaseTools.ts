import { getSettings } from "$lib/globalSettings.svelte";
import {
	ADD_ANSWER_STATS,
	ADD_GAME_STATS,
	DELETE_DICTIONARY,
	GET_ALL_ANSWER_STATS,
	GET_ALL_GAMES_STATS,
	GET_ALL_USERS,
	GET_ANSWER_STATS_BY_GAME,
	GET_ANSWER_STREAKS,
	GET_DICTIONARIES,
	GET_FONT_ID,
	GET_GAME_STATS,
	GET_STATS,
	GET_USERNAME_BY_ID,
	GET_WORD_PART_READINGS,
	GET_WORD_PARTS,
	GET_WORDS,
	GET_WORDS_COUNT,
	IMPORT_DICTIONARY,
} from "$lib/tauriFunctions";
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
		const words: WordInfo[] = await invoke(GET_WORDS, {
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
	const data: number = await invoke(GET_WORDS_COUNT, {
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
	return await invoke(GET_FONT_ID, {
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
	await invoke(ADD_ANSWER_STATS, {
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
	fontId: number | null,
	dictionaryId: number,
): Promise<number>
{
	const index: number = await invoke(ADD_GAME_STATS, {
		roundsCount: roundsCount,
		roundDuration: roundDuration,
		minFrequency: minFrequency,
		maxFrequency: maxFrequency,
		fontId: fontId,
		dictionaryId: dictionaryId,
	});

	return index;
}

export async function getOverallStats(userKey: string, dictionaryId: number): Promise<StatsInfo>
{
	const data: StatsInfo = await invoke(GET_STATS, {
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
	const data: AnswerStreaks[] = await invoke(GET_ANSWER_STREAKS, {
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
	const data: string[] = await invoke(GET_WORD_PARTS, {
		dictionaryId: dictionaryId,
	});
	return data;
}

export async function getWordPartReadings(wordPart: string, dictionaryId: number): Promise<string[]>
{
	const data: string[] = await invoke(GET_WORD_PART_READINGS, {
		wordPart: wordPart,
		dictionaryId: dictionaryId,
	});
	return data;
}

export async function getAllGamesStats(dictionaryId: number): Promise<GameStats[]>
{
	const data: GameStats[] = await invoke(GET_ALL_GAMES_STATS, {
		dictionaryId: dictionaryId,
	});
	return data;
}

export async function getGameStats(id: number): Promise<GameStats>
{
	const data: GameStats = await invoke(GET_GAME_STATS, { id });
	return data;
}

export async function getAnswerStatsByGame(gameStatsId: number): Promise<AnswerStats[]>
{
	const data: AnswerStats[] = await invoke(GET_ANSWER_STATS_BY_GAME, { gameStatsId });
	return data;
}

export async function getAllAnswerStats(dictionaryId: number): Promise<AnswerStats[]>
{
	const data: AnswerStats[] = await invoke(GET_ALL_ANSWER_STATS, {
		dictionaryId: dictionaryId,
	});
	return data;
}

export async function getUserdataById(userId: number): Promise<User>
{
	const userdata: User = await invoke(GET_USERNAME_BY_ID, { userId });
	return userdata;
}

export async function getAllUsers(): Promise<User[]>
{
	const users: User[] = await invoke(GET_ALL_USERS);
	return users;
}

export async function getDictionaries(): Promise<DictionaryInfo[]>
{
	const rawDictionaries: RawDictionaryInfo[] = await invoke(GET_DICTIONARIES);
	
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
	const x = await invoke(DELETE_DICTIONARY, { id });
	console.log(x);
}

export async function importDictionary(dictPath: string): Promise<void>
{
	const x = await invoke(IMPORT_DICTIONARY, { dictPath });
	console.log(x);
}
