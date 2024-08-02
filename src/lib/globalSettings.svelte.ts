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
};

export function getSettings()
{
	return settings;
}
