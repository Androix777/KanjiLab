import { exists, readFile, readDir, type DirEntry } from '@tauri-apps/plugin-fs';
import { invoke } from "@tauri-apps/api/core";
import { GET_EXECUTABLE_FILE_PATH } from "$lib/tauriFunctions";

export class FontLoader
{
	private fontDirectory: string;
	private fontCache: Map<string, FontFace>;

	constructor()
	{
		this.fontDirectory = ``;
		this.fontCache = new Map();
	}

	async initialize()
	{
		try
		{
			const path: string = await invoke(GET_EXECUTABLE_FILE_PATH);
			this.fontDirectory = `${path}\\fonts`;
		}
		catch (error)
		{
			console.error(`Error getting executable file path:`, error);
		}
	}

	async loadFonts()
	{
		try
		{
			const entries: DirEntry[] = await readDir(this.fontDirectory);

			for (const entry of entries)
			{
				if (entry.isFile && entry.name)
				{
					const fontPath = `${this.fontDirectory}\\${entry.name}`;
					const isExist = await exists(fontPath);

					if (isExist)
					{
						const contents = await readFile(fontPath);
						const arrayBuffer: ArrayBuffer = contents.buffer;
						const fontName = entry.name.split(`.`)[0];
						const font = new FontFace(fontName, arrayBuffer);

						await font.load();
						document.fonts.add(font);
						this.fontCache.set(fontName, font);
						console.log(`Font ${entry.name} loaded and added to document`);
					}
					else
					{
						console.warn(`Font file ${fontPath} does not exist`);
					}
				}
			}
		}
		catch (error)
		{
			console.error(`Error loading fonts:`, error);
		}
	}

	getFonts(): string[]
	{
		return Array.from(this.fontCache.keys());
	}

	getRandomFont(): string | null
	{
		const fontNames = this.getFonts();
		if (fontNames.length === 0)
		{
			return null;
		}
		const randomIndex = Math.floor(Math.random() * fontNames.length);
		return fontNames[randomIndex];
	}
}
