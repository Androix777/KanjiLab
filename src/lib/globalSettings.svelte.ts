let userName = $state(`NoName`);

export function getSettings()
{
	return {
		get userName() { return userName; },
		setUserName: (newUserName: string) => { userName = newUserName; },
	};
}
