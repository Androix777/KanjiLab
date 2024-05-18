import Database from "@tauri-apps/plugin-sql";
import type { WordWithReadings, WordWithReadingsSQL } from "./types";
import { invoke } from "@tauri-apps/api/core";

class DatabaseService
{
	private static instance: DatabaseService;
	private db: Database;

	private constructor(db: Database)
	{
		this.db = db;
	}

	public static async getInstance(): Promise<DatabaseService>
	{
		try
		{
			const path: string = await invoke(`get_executable_file_path`);
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
			console.log(data);
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

			console.log(Array.from(wordsMap.values()));

			return Array.from(wordsMap.values());
		}
		catch (error: unknown)
		{
			throw new Error((error as Error).message || `Unknown error occurred`);
		}
	}
}

export default DatabaseService;
