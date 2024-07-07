let userName = $state(`NoName`);
let isConnectedToSelf: boolean = $state(false);

export function getSettings()
{
	return {
		get userName() { return userName; },
		setUserName: (newUserName: string) => { userName = newUserName; },

		get isConnectedToSelf() { return isConnectedToSelf; },
		setIsConnectedToSelf: (newIsConnectedToSelf: boolean) => { isConnectedToSelf = newIsConnectedToSelf; },
	};
}
