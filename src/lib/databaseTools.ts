import type { AnswerStreaks, WordInfo } from "$lib/types";
import { invoke } from "@tauri-apps/api/core";
import { ADD_ANSWER_STATS, ADD_GAME_STATS, GET_ANSWER_STREAKS, GET_FONT_ID, GET_STATS, GET_WORDS } from "$lib/tauriFunctions";
import type { StatsInfo } from "$lib/types";
import { getSettings } from "$lib/globalSettings.svelte";

export async function getRandomWords(count: number): Promise<WordInfo[]>
{
	const data: WordInfo[] = await invoke(GET_WORDS,
		{
			count: count,
			minFrequency: getSettings().minFrequency.get(),
			maxFrequency: getSettings().maxFrequency.get(),
			wordPart: getSettings().wordPart.get() == `` ? null : getSettings().wordPart.get(),
		});

	return data;
}

export async function getFontId(name: string): Promise<number>
{
	return await invoke(GET_FONT_ID,
		{
			name: name,
		});
}

export async function addAnswerStats(gameStatsId: number, word: string, wordReading: string, duration: number, isCorrect: boolean, fontId: number): Promise<void>
{
	await invoke(ADD_ANSWER_STATS,
		{
			gameStatsId: gameStatsId,
			word: word,
			wordReading: wordReading,
			duration: duration,
			isCorrect: isCorrect,
			fontId: fontId,
		});
}

export async function addGameStats(roundsCount: number, roundDuration: number, minFrequency: number, maxFrequency: number, fontId: number | null, dictionaryId: number): Promise<number>
{
	const index: number = await invoke(ADD_GAME_STATS,
		{
			roundsCount: roundsCount,
			roundDuration: roundDuration,
			minFrequency: minFrequency,
			maxFrequency: maxFrequency,
			fontId: fontId,
			dictionaryId: dictionaryId,
		});

	return index;
}

export async function getStats(): Promise<StatsInfo>
{
	const data: StatsInfo = await invoke(GET_STATS);
	return data;
}

export async function getAnswerStreaks(minFrequency: number, maxFrequency: number, count: number): Promise<AnswerStreaks[]>
{
	const data: AnswerStreaks[] = await invoke(GET_ANSWER_STREAKS, { minFrequency: minFrequency, maxFrequency: maxFrequency, count: count });
	return data;
}
