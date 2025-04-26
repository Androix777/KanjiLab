import { invoke } from "@tauri-apps/api/core";
import { exists, readFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { getAllFonts } from "./fontTools";
import { GET_EXECUTABLE_FILE_PATH } from "./tauriFunctions";

type StateVar<T> = {
	get: () => T;
	set: (value: T) => void;
};

let initialized = false;
let savingInProgress = false;

async function getSettingsFilePath(): Promise<string>
{
	let path: string = await invoke(GET_EXECUTABLE_FILE_PATH);
	path = path + "\\settings.json";
	return path;
}

async function saveSettings()
{
	if (savingInProgress) return;

	savingInProgress = true;
	try
	{
		const filePath = await getSettingsFilePath();

		const settingsObj: Record<string, unknown> = {};
		for (const [key, stateVar] of Object.entries(settings))
		{
			settingsObj[key] = stateVar.get();
		}

		await writeTextFile(filePath, JSON.stringify(settingsObj, null, 2));
	}
	catch (error)
	{
		console.error("Failed to save settings:", error);
	}
	finally
	{
		savingInProgress = false;
	}
}

function createStateVar<T>(initial: T): StateVar<T>
{
	let value = $state(initial);
	return {
		get: () => value,
		set: (newValue: T) =>
		{
			value = newValue;

			if (initialized && !savingInProgress)
			{
				void saveSettings();
			}
		},
	};
}

const settings = {
	ipAddress: createStateVar(`127.0.0.1`),
	joinPort: createStateVar(`8080`),
	hostPort: createStateVar(`8080`),
	minFrequency: createStateVar(0),
	maxFrequency: createStateVar(10000),
	usingMaxFrequency: createStateVar(true),
	roundDuration: createStateVar(10),
	roundsCount: createStateVar(10),
	wordPart: createStateVar(``),
	wordPartReading: createStateVar(``),
	selectedFonts: createStateVar(new Array<string>()),
	currentAccount: createStateVar(0),
	avatars: createStateVar(0),
	toggledColumns: createStateVar(['dictionary', 'font', 'realRoundsCount', 'usersCount', 'timestamp']),
};

async function loadSettings()
{
	try
	{
		const filePath = await getSettingsFilePath();

		let settingsExists = false;
		try
		{
			settingsExists = await exists(filePath);
		}
		catch (error)
		{
			console.error("Error checking if settings file exists:", error);
		}

		if (!settingsExists)
		{
			await saveSettings();
			return;
		}

		let settingsJson;
		try
		{
			settingsJson = (new TextDecoder()).decode(await readFile(filePath));
			const loadedSettings = JSON.parse(settingsJson) as Record<string, unknown>;

			const oldSavingInProgress = savingInProgress;
			savingInProgress = true;

			for (const [key, value] of Object.entries(loadedSettings))
			{
				if (key in settings)
				{
					settings[key as keyof typeof settings].set(value as never);
				}
			}

			const availableFonts: string[] = await getAllFonts();
			getSettings().selectedFonts.set(getSettings().selectedFonts.get().filter((fontName) => availableFonts.includes(fontName)));

			savingInProgress = oldSavingInProgress;
		}
		catch (error)
		{
			console.error("Error processing settings file:", error);
			await saveSettings();
		}
	}
	catch (error)
	{
		console.error("Failed to load settings:", error);
		await saveSettings();
	}
}

export function getSettings()
{
	if (!initialized)
	{
		initialized = true;

		void loadSettings();
	}
	return settings;
}
