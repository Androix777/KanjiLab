import Database from "@tauri-apps/plugin-sql";
import type { WordInfo, WordInfoSQL } from "$lib/types";
import { invoke } from "@tauri-apps/api/core";
import { GET_EXECUTABLE_FILE_PATH } from "$lib/tauriFunctions";
import type { StatsInfo } from "$lib/types";
import { getSettings } from "$lib/globalSettings.svelte";

class DatabaseService
{
	private static instance: DatabaseService | null;
	private db: Database;

	private constructor(db: Database)
	{
		this.db = db;
	}

	public static async getInstance(): Promise<DatabaseService>
	{
		if (this.instance != null) return this.instance;
		try
		{
			const path: string = await invoke(GET_EXECUTABLE_FILE_PATH);
			const dbPath = `${path}\\words.db`;
			const db = await Database.load(`sqlite:${dbPath}`);
			DatabaseService.instance = new DatabaseService(db);
		}
		catch (error)
		{
			console.error(`Failed to load database:`, error);
			throw error;
		}
		return DatabaseService.instance;
	}

	async getRandomWords(count: number): Promise<WordInfo[]>
	{
		let query = ``;
		if (getSettings().wordPart.get() == ``)
		{
			query = `
				SELECT 
					w.id AS word_id, 
					w.word, 
					wr.id AS reading_id, 
					wr.word_reading
				FROM (
					SELECT id, word 
					FROM word 
					WHERE frequency > ${getSettings().minFrequency.get()} AND frequency < ${getSettings().maxFrequency.get()}
					ORDER BY RANDOM() 
					LIMIT ${count}
				) AS w
				JOIN word_reading AS wr ON w.id = wr.word_id;
			`;
		}
		else
		{
			query = `
				WITH filtered_words AS (
					SELECT id, word
					FROM word
					WHERE frequency BETWEEN ${getSettings().minFrequency.get()} AND ${getSettings().maxFrequency.get()}
				),
				filtered_word_parts AS (
					SELECT id
					FROM word_part_reading
					WHERE word_part = '${getSettings().wordPart.get()}'
				),
				filtered_word_readings AS (
					SELECT wr.id, wr.word_id, wr.word_reading
					FROM word_reading wr
					JOIN word_reading_word_part_reading wrwpr ON wr.id = wrwpr.word_reading_id
					WHERE wrwpr.word_part_reading_id IN (SELECT id FROM filtered_word_parts)
				),
				selected_words AS (
					SELECT fw.id, fw.word
					FROM filtered_words fw
					JOIN filtered_word_readings fwr ON fw.id = fwr.word_id
					GROUP BY fw.id, fw.word
					ORDER BY RANDOM()
					LIMIT ${count}
				)
				SELECT 
					sw.id AS word_id, 
					sw.word, 
					fwr.id AS reading_id, 
					fwr.word_reading
				FROM selected_words sw
				JOIN filtered_word_readings fwr ON sw.id = fwr.word_id;
			`;
		}

		try
		{
			const data: WordInfoSQL[] = await this.db.select(query);
			console.log(data);
			const wordsMap: Map<string, WordInfo> = new Map();
			data.forEach((result) =>
			{
				const wordIdKey = result.word_id.toString();

				if (!wordsMap.has(wordIdKey))
				{
					wordsMap.set(wordIdKey, {
						id: result.word_id,
						word: result.word,
						wordReadings: [],
					});
				}

				const wordWithReadings = wordsMap.get(wordIdKey);
				if (wordWithReadings)
				{
					wordWithReadings.wordReadings.push({
						id: result.reading_id,
						reading: result.word_reading,
					});
				}
			});

			return Array.from(wordsMap.values());
		}
		catch (error: unknown)
		{
			throw new Error((error as Error).message || `Unknown error occurred`);
		}
	}

	uint8ArrayToHexString(uint8Array: Uint8Array): string
	{
		const hexString = Array.from(uint8Array)
			.map(byte => byte.toString(16).padStart(2, `0`))
			.join(``);
		return `X'${hexString}'`;
	}

	async addAnswerResult(wordId: Uint8Array, wordReadingId: Uint8Array | null): Promise<void>
	{
		const query = `
        INSERT INTO word_answer_results (word_id, word_reading_id)
        VALUES (${this.uint8ArrayToHexString(wordId)}, ${wordReadingId == null ? `null` : this.uint8ArrayToHexString(wordReadingId)});
		`;

		await this.db.execute(query);
	}

	async getStats(): Promise<StatsInfo>
	{
		const query = `
        SELECT sum(CASE WHEN word_reading_id NOT NULL THEN 1 ELSE 0 END) AS correctCount, sum(CASE WHEN word_reading_id NOT NULL THEN 0 ELSE 1 END) as wrongCount
		FROM word_answer_results
		`;

		const data: StatsInfo[] = await this.db.select(query);

		return data[0];
	}
}

export default DatabaseService;
