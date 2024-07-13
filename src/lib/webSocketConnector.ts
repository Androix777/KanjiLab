import { getSettings } from "./globalSettings.svelte";
import { type ClientRegisteredPayload, type BaseMessage, type ClientListMessage, type ClientRegisteredMessage, type GetClientListMessage, type RegisterClientMessage, type StatusMessage } from "./types";

export class ServerConnector extends EventTarget
{
	private webSocket: WebSocket | null = null;
	private messagePool: Map<string, (message: BaseMessage<object, string>) => void> = new Map();

	public async connect(ipAddress: string)
	{
		this.disconnect();
		this.webSocket = new WebSocket(ipAddress);
		this.webSocket.onopen = async () =>
		{
			console.log(`socket open`);
			await this.sendRegisterClientMessage();
			resolvePromise(true);
		};
		this.webSocket.onmessage = (event) =>
		{
			if (typeof event.data == `string`)
			{
				const message: BaseMessage<object, string> = <BaseMessage<object, string>>JSON.parse(event.data);
				console.log(`Received message: ` + event.data);
				if (!message.correlation_id) return;

				const callback = this.messagePool.get(message.correlation_id);
				if (callback)
				{
					callback(message);
					this.messagePool.delete(message.correlation_id);
				}
				else
				{
					this.handleReceivedMessage(message);
				}
			}
		};
		this.webSocket.onclose = () =>
		{
			console.log(`socket close`);
			this.dispatchEvent(new Event(`socketClosed`));
			this.disconnect();
		};
		this.webSocket.onerror = () =>
		{
			console.log(`socket error`);
		};

		let resolvePromise: (result: boolean) => void;
		let rejectPromise: () => void;
		const resultPromise: Promise<boolean> = new Promise((resolve, reject) =>
		{
			resolvePromise = resolve;
			rejectPromise = reject;
		});

		setTimeout(() =>
		{
			rejectPromise();
		}, 5000);

		return await resultPromise;
	}

	public disconnect()
	{
		this.webSocket?.close();
	}

	public async sendRegisterClientMessage()
	{
		if (!this.webSocket) return false;
		const correlation_id = crypto.randomUUID();
		const registerClientMessage: RegisterClientMessage = {
			message_type: `registerClient`,
			correlation_id: correlation_id,
			payload: {
				name: getSettings().userName,
			},
		};

		let resolvePromise: (result: boolean) => void;
		let rejectPromise: () => void;
		const resultPromise: Promise<boolean> = new Promise((resolve, reject) =>
		{
			resolvePromise = resolve;
			rejectPromise = reject;
		});

		this.messagePool.set(correlation_id, (message) =>
		{
			const statusMessage = <StatusMessage>message;

			if (statusMessage.payload.status == `success`)
			{
				resolvePromise(true);
			}
			else
			{
				resolvePromise(false);
			}
		});

		setTimeout(() =>
		{
			rejectPromise();
		}, 5000);

		this.webSocket.send(JSON.stringify(registerClientMessage));
		const result = await resultPromise;
		return result;
	}

	public async sendGetClientListMessage()
	{
		if (!this.webSocket) return false;
		const correlation_id = crypto.randomUUID();
		const getClientListMessage: GetClientListMessage = {
			message_type: `getClientList`,
			correlation_id: correlation_id,
			payload: {},
		};

		let resolvePromise: (clientList: Array<{ id: string; name: string }>) => void;
		let rejectPromise: () => void;
		const resultPromise: Promise<Array<{ id: string; name: string }>> = new Promise((resolve, reject) =>
		{
			resolvePromise = resolve;
			rejectPromise = reject;
		});

		this.messagePool.set(correlation_id, (message) =>
		{
			const clientListMessage = <ClientListMessage>message;
			resolvePromise(clientListMessage.payload.clients);
		});

		setTimeout(() =>
		{
			rejectPromise();
		}, 5000);

		this.webSocket.send(JSON.stringify(getClientListMessage));
		const result = await resultPromise;
		return result;
	}

	private handleReceivedMessage(message: BaseMessage<object, string>)
	{
		switch (message.message_type)
		{
			case `clientRegistered`:
			{
				const clientRegisteredMessage = <ClientRegisteredMessage>message;
				const event = new CustomEvent<ClientRegisteredPayload>(`clientRegistered`, { detail: clientRegisteredMessage.payload });
				this.dispatchEvent(event);
				break;
			}
			case `clientDisconnected`:
			{
				const clientDisconnectedMessage = <ClientRegisteredMessage>message;
				const event = new CustomEvent<ClientRegisteredPayload>(`clientDisconnected`, { detail: clientDisconnectedMessage.payload });
				this.dispatchEvent(event);
				break;
			}
			default:
				console.log(`Received unknown message type: ${message.message_type}`);
		}
	}
}
