import { GET_ALL_FONTS_INFO, GET_FONT_LIST, GET_SVG_TEXT } from "$lib/tauriFunctions";
import { invoke } from "@tauri-apps/api/core";
import { getSettings } from "./globalSettings.svelte";
import type { FontInfo } from "./types";

let fontNames: string[] | null = null;

async function loadFonts(): Promise<void>
{
	if (fontNames === null)
	{
		try
		{
			fontNames = await invoke(GET_FONT_LIST);
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

export async function getDefaultFont(): Promise<string>
{
	await loadFonts();
	if (fontNames && fontNames.length > 0)
	{
		return fontNames[0];
	}
	throw new Error(`No fonts available`);
}

export function getFontInfo(fontName: string): FontInfo | null
{
	const fontInfo = getSettings().fontsInfo.get().filter((fontInfo) =>
	{
		return fontInfo.fontFile == fontName;
	}).at(0);

	return fontInfo ?? null;
}

export async function getAllFonts(): Promise<string[]>
{
	await loadFonts();
	return fontNames || [];
}

export async function getAllFontsInfo(): Promise<FontInfo[]>
{
	return await invoke(GET_ALL_FONTS_INFO);
}

export async function getSVGText(text: string, fontFileName: string): Promise<string>
{
	return await invoke(GET_SVG_TEXT, { text: text, fontName: fontFileName });
}
