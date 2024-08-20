import type { WordInfo } from "$lib/types";
import { invoke } from "@tauri-apps/api/core";
import { ADD_ANSWER_RESULT, GET_STATS, GET_WORDS } from "$lib/tauriFunctions";
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

export async function addAnswerResult(word: string, word_reading: string | null, is_correct: boolean): Promise<void>
{
	await invoke(ADD_ANSWER_RESULT,
		{
			word: word,
			wordReading: word_reading,
			isCorrect: is_correct,
		});
}

export async function getStats(): Promise<StatsInfo>
{
	const data: StatsInfo = await invoke(GET_STATS);
	return data;
}
