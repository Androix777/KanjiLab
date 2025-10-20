import { invoke } from "@tauri-apps/api/core";
import type { FontInfo } from "./types";
import WebSocketClient from "./webSocketClient.svelte";

let fontNames: string[] | null = null;

async function loadFonts(): Promise<void>
{
	if (fontNames === null)
	{
		try
		{
			fontNames = await invoke("get_font_list");
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
	const fontInfo = WebSocketClient.getInstance().fontsInfo.filter((fontInfo) =>
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
	return await invoke("get_all_fonts_info");
}

export async function getSVGText(text: string, fontFileName: string): Promise<string>
{
	return await invoke("get_svg_text", { text: text, fontName: fontFileName });
}
