import Database from 'tauri-plugin-sql-api';
import type { Word } from './types';
import { invoke } from '@tauri-apps/api/tauri';

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
		if (!DatabaseService.instance) 
		{
			try 
			{
				const path: string = await invoke('get_executable_file_path');
				const dbPath = `${path}\\words.db`;
				const db = await Database.load(`sqlite:${dbPath}`);
				DatabaseService.instance = new DatabaseService(db);
			} 
			catch (error) 
			{
				console.error('Failed to load database:', error);
				throw error;
			}
		}
		return DatabaseService.instance;
	}

	async getRandomWords(count: number): Promise<Word[]> 
	{
		const query = `SELECT * FROM words ORDER BY RANDOM() LIMIT $1`;
		try 
		{
			return await this.db.select(query, [count]);
		} 
		catch (error) 
		{
			throw new Error(`${error}`);
		}
	}
}

export default DatabaseService;
