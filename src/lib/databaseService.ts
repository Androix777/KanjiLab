import Database from 'tauri-plugin-sql-api';
import type { Word } from './types';

class DatabaseService {
	private static instance: DatabaseService;
	private db: any;

	private constructor(db: any) {
		this.db = db;
	}

	public static async getInstance(): Promise<DatabaseService> {
		if (!DatabaseService.instance) {
			const db = await Database.load('sqlite:words.db');
			DatabaseService.instance = new DatabaseService(db);
		}
		return DatabaseService.instance;
	}

	async getRandomWords(count: number): Promise<Word[]> {
		const query = `SELECT * FROM words ORDER BY RANDOM() LIMIT $1`;
		try {
			return await this.db.select(query, [count]);
		} catch (error) {
			throw new Error(`${error}`);
		}
	}
}

export default DatabaseService;
