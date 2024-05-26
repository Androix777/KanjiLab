import Database from "@tauri-apps/plugin-sql";
import type { WordWithReadings, WordWithReadingsSQL } from "./types";
import { invoke } from "@tauri-apps/api/core";
import { GET_EXECUTABLE_FILE_PATH } from "./turiFunctions";

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

	async getRandomWords(count: number): Promise<WordWithReadings[]>
	{
		const query = `
			SELECT 
				w.id AS word_id, 
				w.word, 
				wr.id AS reading_id, 
				wr.word_reading
			FROM (
				SELECT id, word 
				FROM word 
				WHERE frequency < 10000
				ORDER BY RANDOM() 
				LIMIT ?
			) AS w
			JOIN word_reading AS wr ON w.id = wr.word_id;
		`;

		try
		{
			const data: WordWithReadingsSQL[] = await this.db.select(query, [count]);
			const wordsMap: Map<string, WordWithReadings> = new Map();
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
		console.log(wordId);
		console.log(wordReadingId);

		const query = `
        INSERT INTO word_answer_results (word_id, word_reading_id)
        VALUES (${this.uint8ArrayToHexString(wordId)}, ${wordReadingId == null ? `null` : this.uint8ArrayToHexString(wordReadingId)});
		`;

		await this.db.execute(query);
	}
}

export default DatabaseService;
