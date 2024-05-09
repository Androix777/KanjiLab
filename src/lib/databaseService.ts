import Database from "tauri-plugin-sql-api";
import type { WordWithReadings, WordWithReadingsSQL } from "./types";
import { WordWithReadingsSQLMap } from "./types";
import { invoke } from "@tauri-apps/api/tauri";

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
		const query = `SELECT word.word, GROUP_CONCAT(word_reading.word_reading, ',') AS wordReadings
			FROM word
			JOIN word_reading ON word.id = word_reading.word_id
			GROUP BY word.word
			ORDER BY RANDOM()
			LIMIT $1`;
		try
		{
			const result: WordWithReadingsSQL[] = await this.db.select(query, [count]);
			return result.map((x) =>
			{
				return WordWithReadingsSQLMap(x);
			});
		}
		catch (error: unknown)
		{
			throw new Error((error as Error).message || `Unknown error occurred`);
		}
	}
}

export default DatabaseService;
