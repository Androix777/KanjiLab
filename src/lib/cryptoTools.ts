import { invoke } from "@tauri-apps/api/core";
import { GET_PUBLIC_KEY, SIGN_MESSAGE, VERIFY_SIGNaTURE } from "./tauriFunctions";

export async function getPublicKey(): Promise<string>
{
	const key: string = await invoke(GET_PUBLIC_KEY);
	return key;
}

export async function signMessage(message: string): Promise<string>
{
	const signature: string = await invoke(SIGN_MESSAGE, { message: message });
	return signature;
}

export async function verifySignature(message: string, signature: string, key: string): Promise<boolean>
{
	const result: boolean = await invoke(VERIFY_SIGNaTURE, {
		message: message,
		signature: signature,
		key: key,
	});
	return result;
}
