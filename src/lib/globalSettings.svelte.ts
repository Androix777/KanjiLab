import type { FontInfo } from "./types";

type StateVar<T> = {
	get: () => T;
	set: (value: T) => void;
};

function createStateVar<T>(initial: T): StateVar<T>
{
	let value = $state(initial);
	return {
		get: () => value,
		set: (newValue: T) =>
		{
			value = newValue;
		},
	};
}

const settings = {
	userName: createStateVar(`NoName`),
	ipAddress: createStateVar(`127.0.0.1`),
	joinPort: createStateVar(`8080`),
	adminPassword: createStateVar(``),
	minFrequency: createStateVar(0),
	maxFrequency: createStateVar(10000),
	usingMaxFrequency: createStateVar(true),
	roundDuration: createStateVar(10),
	roundsCount: createStateVar(10),
	wordPart: createStateVar(``),
	selectedFonts: createStateVar(new Array<string>()),
	fontsInfo: createStateVar(new Array<FontInfo>()),
	currentAccount: createStateVar(0),
};

export function getSettings()
{
	return settings;
}
