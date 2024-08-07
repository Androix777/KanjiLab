type StateVar<T> = {
	get: () => T;
	set: (value: T) => void;
};

function createStateVar<T>(initial: T): StateVar<T>
{
	let value = $state(initial);
	return {
		get: () => value,
		set: (newValue: T) => { value = newValue; },
	};
}

const settings = {
	userName: createStateVar(`NoName`),
	ipAddress: createStateVar(`ws://127.0.0.1:8080`),
	adminPassword: createStateVar(``),
	minFrequency: createStateVar(0),
	maxFrequency: createStateVar(10000),
	roundDuration: createStateVar(10),
	roundsCount: createStateVar(10),
	wordPart: createStateVar(``),
};

export function getSettings()
{
	return settings;
}
