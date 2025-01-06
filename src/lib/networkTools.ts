import { invoke } from "@tauri-apps/api/core";
import { CREATE_ACCOUNT, GET_ACCOUNTS, LAUNCH_SERVER, REMOVE_ACCOUNT, RENAME_ACCOUNT, SIGN_MESSAGE, STOP_SERVER, VERIFY_SIGNATURE } from "./tauriFunctions";

export type AccountInfo = {
	name: string;
	privateKey: string;
	publicKey: string;
};

export async function createAccount(name: string): Promise<AccountInfo>
{
	return await invoke(CREATE_ACCOUNT, { name });
}

export async function removeAccount(publicKey: string): Promise<void>
{
	await invoke(REMOVE_ACCOUNT, { publicKey });
}

export async function getAccounts(): Promise<AccountInfo[]>
{
	return await invoke(GET_ACCOUNTS);
}

export async function signMessage(publicKey: string, message: string): Promise<string>
{
	return await invoke(SIGN_MESSAGE, { publicKey, message });
}

export async function verifySignature(publicKey: string, message: string, signature: string): Promise<boolean>
{
	return await invoke(VERIFY_SIGNATURE, { publicKey, message, signature });
}

export async function renameAccount(publicKey: string, newName: string): Promise<void>
{
	await invoke(RENAME_ACCOUNT, { publicKey, newName });
}

export async function launchServer(): Promise<string>
{
	return await invoke(LAUNCH_SERVER);
}

export async function stopServer(): Promise<void>
{
	await invoke(STOP_SERVER);
}
