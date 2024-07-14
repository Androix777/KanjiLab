import { getSettings } from "./globalSettings.svelte";
import { type ClientRegisteredPayload, type BaseMessage, type ClientListMessage, type ClientRegisteredMessage, type GetClientListMessage, type RegisterClientMessage, type StatusMessage, type SendChatMessage, type ChatSentMessage, type ChatSentPayload } from "./types";

export class ServerConnector extends EventTarget
{
	private webSocket: WebSocket | null = null;
	private messagePool: Map<string, (message: BaseMessage<object, string>) => void> = new Map();

	public async connect(ipAddress: string)
	{
		this.disconnect();
		this.webSocket = new WebSocket(ipAddress);
		this.webSocket.onopen = () =>
		{
			console.log(`socket open`);
			resolvePromise();
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

		let resolvePromise: () => void;
		let rejectPromise: (error: Error) => void;
		const resultPromise: Promise<void> = new Promise((resolve, reject) =>
		{
			resolvePromise = resolve;
			rejectPromise = reject;
		});

		setTimeout(() =>
		{
			rejectPromise(new Error(`timeoutError`));
		}, 5000);

		await resultPromise;
	}

	public disconnect()
	{
		this.webSocket?.close();
	}

	public async sendRegisterClientMessage()
	{
		if (!this.webSocket) throw new Error(`missingWebsocket`);
		const correlation_id = crypto.randomUUID();
		const registerClientMessage: RegisterClientMessage = {
			message_type: `registerClient`,
			correlation_id: correlation_id,
			payload: {
				name: getSettings().userName,
			},
		};

		let resolvePromise: () => void;
		let rejectPromise: (error: Error) => void;
		const resultPromise: Promise<void> = new Promise((resolve, reject) =>
		{
			resolvePromise = resolve;
			rejectPromise = reject;
		});

		this.messagePool.set(correlation_id, (message) =>
		{
			const statusMessage = <StatusMessage>message;

			if (statusMessage.payload.status == `success`)
			{
				resolvePromise();
			}
			else
			{
				rejectPromise(new Error(statusMessage.payload.status));
			}
		});

		setTimeout(() =>
		{
			rejectPromise(new Error(`timeoutError`));
		}, 5000);

		this.webSocket.send(JSON.stringify(registerClientMessage));
		await resultPromise;
	}

	public async sendGetClientListMessage()
	{
		if (!this.webSocket) throw new Error(`missingWebsocket`);
		const correlation_id = crypto.randomUUID();
		const getClientListMessage: GetClientListMessage = {
			message_type: `getClientList`,
			correlation_id: correlation_id,
			payload: {},
		};

		let resolvePromise: (clientList: Array<{ id: string; name: string }>) => void;
		let rejectPromise: (error: Error) => void;
		const resultPromise: Promise<Array<{ id: string; name: string }>> = new Promise((resolve, reject) =>
		{
			resolvePromise = resolve;
			rejectPromise = reject;
		});

		this.messagePool.set(correlation_id, (message) =>
		{
			switch (message.message_type)
			{
				case `clientList`:
				{
					const clientListMessage = <ClientListMessage>message;
					resolvePromise(clientListMessage.payload.clients);
					break;
				}
				case `status`:
				{
					const statusMessage = <StatusMessage>message;
					rejectPromise(new Error(statusMessage.payload.status));
					break;
				}
				default:
					console.log(`Received unknown message type: ${message.message_type}`);
			}
		});

		setTimeout(() =>
		{
			rejectPromise(new Error(`timeoutError`));
		}, 5000);

		this.webSocket.send(JSON.stringify(getClientListMessage));
		return await resultPromise;
	}

	public sendChatMessage(message: string)
	{
		if (!this.webSocket) throw new Error(`missingWebsocket`);
		const correlation_id = crypto.randomUUID();
		const sendChatMessage: SendChatMessage = {
			message_type: `sendChat`,
			correlation_id: correlation_id,
			payload: { message: message },
		};

		this.webSocket.send(JSON.stringify(sendChatMessage));
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
			case `chatSent`:
			{
				const chatSentMessage = <ChatSentMessage>message;
				const event = new CustomEvent<ChatSentPayload>(`chatSent`, { detail: chatSentMessage.payload });
				this.dispatchEvent(event);
				break;
			}
			default:
				console.log(`Received unknown message type: ${message.message_type}`);
		}
	}
}
