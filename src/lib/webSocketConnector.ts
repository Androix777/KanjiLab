import { getSettings } from "./globalSettings.svelte";
import {
	type ClientRegisteredPayload,
	type BaseMessage,
	type ClientListMessage,
	type ClientRegisteredMessage,
	type GetClientListMessage,
	type RegisterClientMessage,
	type StatusMessage,
	type SendChatMessage,
	type ChatSentMessage,
	type ChatSentPayload,
	type MessageType,
} from "./types";

export class ServerConnector extends EventTarget
{
	private webSocket: WebSocket | null = null;
	private messagePool: Map<string, (message: BaseMessage<object, MessageType>) => void> = new Map();

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
				const message: BaseMessage<object, MessageType> = <BaseMessage<object, MessageType>>JSON.parse(event.data);
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

	async sendWebSocketMessage(
		message: BaseMessage<object, MessageType>,
		timeout: number = 5000,
	): Promise<BaseMessage<object, MessageType>>
	{
		if (!this.webSocket) throw new Error(`missingWebsocket`);
		return new Promise<BaseMessage<object, MessageType>>((resolve, reject) =>
		{
			const timeoutId = setTimeout(() =>
			{
				reject(new Error(`timeoutError`));
			}, timeout);

			this.messagePool.set(message.correlation_id, (response: BaseMessage<object, MessageType>) =>
			{
				clearTimeout(timeoutId);
				resolve(response);
			});

			if (!this.webSocket) throw new Error(`missingWebsocket`);
			this.webSocket.send(JSON.stringify(message));
		});
	}

	public async sendRegisterClientMessage()
	{
		const message: RegisterClientMessage = {
			message_type: `registerClient`,
			correlation_id: crypto.randomUUID(),
			payload: {
				name: getSettings().userName,
			},
		};

		const response = await this.sendWebSocketMessage(message);

		switch (response.message_type)
		{
			case `status`:
			{
				const statusMessage = <StatusMessage>response;

				if (statusMessage.payload.status == `success`)
				{
					return;
				}
				else
				{
					throw new Error(statusMessage.payload.status);
				}
			}
			default:
				console.log(`Received unknown message type: ${message.message_type}`);
				throw new Error(`unknownMessageType`);
		}
	}

	public async sendGetClientListMessage()
	{
		const message: GetClientListMessage = {
			message_type: `getClientList`,
			correlation_id: crypto.randomUUID(),
			payload: {},
		};

		const response = await this.sendWebSocketMessage(message);

		switch (response.message_type)
		{
			case `clientList`:
			{
				const clientListMessage = <ClientListMessage>response;
				return clientListMessage.payload.clients;
			}
			case `status`:
			{
				const statusMessage = <StatusMessage>response;
				throw new Error(statusMessage.payload.status);
			}
			default:
				console.log(`Received unknown message type: ${message.message_type}`);
				throw new Error(`unknownMessageType`);
		}
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

	private handleReceivedMessage(message: BaseMessage<object, MessageType>)
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
