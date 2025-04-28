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
import type { AnswerStats, AnswerStreaks, DictionaryInfo, GameStats, User, WordInfo } from "$lib/types";
import type { StatsInfo } from "$lib/types";
import { invoke } from "@tauri-apps/api/core";

export async function getRandomWords(count: number): Promise<WordInfo[]>
{
	const data: WordInfo[] = await invoke(GET_WORDS, {
		count: count,
		minFrequency: getSettings().minFrequency.get(),
		maxFrequency: getSettings().usingMaxFrequency.get() ? getSettings().maxFrequency.get() : null,
		wordPart: getSettings().wordPart.get() == `` ? null : getSettings().wordPart.get(),
		wordPartReading: getSettings().wordPartReading.get() == `` ? null : getSettings().wordPartReading.get(),
		examplesCount: 5,
	});

	return data;
}

export async function getWordsCount(): Promise<number>
{
	const data: number = await invoke(GET_WORDS_COUNT, {
		minFrequency: getSettings().minFrequency.get(),
		maxFrequency: getSettings().usingMaxFrequency.get() ? getSettings().maxFrequency.get() : null,
		wordPart: getSettings().wordPart.get() == `` ? null : getSettings().wordPart.get(),
		wordPartReading: getSettings().wordPartReading.get() == `` ? null : getSettings().wordPartReading.get(),
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
	maxFrequency: number,
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

export async function getOverallStats(userKey: string): Promise<StatsInfo>
{
	const data: StatsInfo = await invoke(GET_STATS, {
		userKey: userKey,
	});
	return data;
}

export async function getAnswerStreaks(
	minFrequency: number,
	maxFrequency: number,
	count: number,
	userKey: string,
): Promise<AnswerStreaks[]>
{
	const data: AnswerStreaks[] = await invoke(GET_ANSWER_STREAKS, {
		minFrequency: minFrequency,
		maxFrequency: maxFrequency,
		count: count,
		userKey: userKey,
	});
	return data;
}

export async function getWordParts(): Promise<string[]>
{
	const data: string[] = await invoke(GET_WORD_PARTS);
	return data;
}

export async function getWordPartReadings(wordPart: string): Promise<string[]>
{
	const data: string[] = await invoke(GET_WORD_PART_READINGS, { wordPart });
	return data;
}

export async function getAllGamesStats(): Promise<GameStats[]>
{
	const data: GameStats[] = await invoke(GET_ALL_GAMES_STATS);
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

export async function getAllAnswerStats(): Promise<AnswerStats[]>
{
	const data: AnswerStats[] = await invoke(GET_ALL_ANSWER_STATS);
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
	const dictionaries: DictionaryInfo[] = await invoke(GET_DICTIONARIES);
	return dictionaries;
}

export async function deleteDictionary(id: number): Promise<void>
{
	const x = await invoke(DELETE_DICTIONARY, {id});
	console.log(x)
}


export async function importDictionary(dictPath: string): Promise<void>
{
	const x = await invoke(IMPORT_DICTIONARY, {dictPath});
	console.log(x)
}