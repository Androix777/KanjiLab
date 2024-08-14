import { readDir, type DirEntry } from '@tauri-apps/plugin-fs';
import { invoke } from "@tauri-apps/api/core";
import { GET_EXECUTABLE_FILE_PATH } from "$lib/tauriFunctions";

let fontDirectory: string = ``;
let fontNames: string[] | null = null;

async function initialize(): Promise<void>
{
	if (!fontDirectory)
	{
		try
		{
			const path: string = await invoke(GET_EXECUTABLE_FILE_PATH);
			fontDirectory = `${path}\\fonts`;
		}
		catch (error)
		{
			console.error(`Error getting executable file path:`, error);
			throw error;
		}
	}
}

async function loadFonts(): Promise<void>
{
	if (fontNames === null)
	{
		try
		{
			await initialize();
			const entries: DirEntry[] = await readDir(fontDirectory);
			fontNames = entries
				.filter(entry => entry.isFile && entry.name)
				.map(entry => entry.name);
		}
		catch (error)
		{
			console.error(`Error loading fonts:`, error);
			fontNames = [];
		}
	}
}

export async function getRandomFont(): Promise<string>
{
	await loadFonts();
	if (fontNames && fontNames.length > 0)
	{
		const randomIndex = Math.floor(Math.random() * fontNames.length);
		return fontNames[randomIndex];
	}
	throw new Error(`No fonts available`);
}

export async function getAllFonts(): Promise<string[]>
{
	await loadFonts();
	return fontNames || [];
}
