let userName = $state(`NoName`);
let isConnectedToSelf: boolean = $state(false);
let ipAddress: string = $state(`ws://127.0.0.1:8080`);
let adminPassword: string = $state(``);

export function getSettings()
{
	return {
		get userName() { return userName; },
		setUserName: (value: string) => { userName = value; },

		get isConnectedToSelf() { return isConnectedToSelf; },
		setIsConnectedToSelf: (value: boolean) => { isConnectedToSelf = value; },

		get ipAddress() { return ipAddress; },
		setIpAddress: (value: string) => { ipAddress = value; },

		get adminPassword() { return adminPassword; },
		setAdminPassword: (value: string) => { adminPassword = value; },
	};
}
