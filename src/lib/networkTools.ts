import { invoke } from "@tauri-apps/api/core";

export type AccountInfo = {
	name: string;
	privateKey: string;
	publicKey: string;
};

export async function createAccount(name: string): Promise<AccountInfo>
{
	return await invoke("create_account", { name });
}

export async function removeAccount(publicKey: string): Promise<void>
{
	await invoke("remove_account", { publicKey });
}

export async function getAccounts(): Promise<AccountInfo[]>
{
	return await invoke("get_accounts");
}

export async function signMessage(publicKey: string, message: string): Promise<string>
{
	return await invoke("sign_message", { publicKey, message });
}

export async function verifySignature(publicKey: string, message: string, signature: string): Promise<boolean>
{
	return await invoke("verify_signature", { publicKey, message, signature });
}

export async function renameAccount(publicKey: string, newName: string): Promise<void>
{
	await invoke("rename_account", { publicKey, newName });
}

export async function launchServer(hostPort: string): Promise<void>
{
	await invoke("launch_server", { hostPort: hostPort });
}

export async function stopServer(): Promise<void>
{
	await invoke("stop_server");
}
