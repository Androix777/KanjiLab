import { getSettings } from "./globalSettings.svelte";
import {
	type OutNotifClientRegisteredPayload,
	type BaseMessage,
	type OutRespClientListMessage,
	type OutNotifClientRegisteredMessage,
	type InReqGetClientListMessage,
	type InReqRegisterClientMessage,
	type OutRespStatusMessage,
	type InReqSendChatMessage,
	type OutNotifChatSentMessage,
	type OutNotifChatSentPayload,
	type MessageType,
	type InReqMakeAdminMessage,
	type OutRespClientRegisteredMessage,
	type OutNotifAdminMadeMessage,
	type OutNotifAdminMadePayload,
	type InReqStartGameMessage,
	type OutReqQuestionMessage,
	type InRespQuestionMessage,
	type OutNotifQuestionMessage,
	type OutNotifQuestionPayload,
	type InReqSendAnswerMessage,
	type OutNotifRoundEndedMessage,
	type OutNotifRoundEndedPayload,
	type OutNotifClientAnsweredMessage,
	type OutNotifClientAnsweredPayload,
	type InReqStopGameMessage,
	type OutNotifGameStoppedMessage,
	type OutNotifGameStoppedPayload,
	type OutNotifGameStartedMessage,
	type OutNotifGameStartedPayload,
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
		const message: InReqRegisterClientMessage = {
			message_type: `IN_REQ_registerClient`,
			correlation_id: crypto.randomUUID(),
			payload: {
				name: getSettings().userName.get(),
			},
		};

		const response = await this.sendWebSocketMessage(message);

		switch (response.message_type)
		{
			case `OUT_RESP_clientRegistered`:
			{
				const clientRegisteredMessage = <OutRespClientRegisteredMessage>response;
				return clientRegisteredMessage.payload.id;
			}
			case `OUT_RESP_status`:
			{
				const statusMessage = <OutRespStatusMessage>response;
				throw new Error(statusMessage.payload.status);
			}
			default:
				console.log(`Received unknown message type: ${message.message_type}`);
				throw new Error(`unknownMessageType`);
		}
	}

	public async sendGetClientListMessage()
	{
		const message: InReqGetClientListMessage = {
			message_type: `IN_REQ_clientList`,
			correlation_id: crypto.randomUUID(),
			payload: {},
		};

		const response = await this.sendWebSocketMessage(message);

		switch (response.message_type)
		{
			case `OUT_RESP_clientList`:
			{
				const clientListMessage = <OutRespClientListMessage>response;
				return clientListMessage.payload.clients;
			}
			case `OUT_RESP_status`:
			{
				const statusMessage = <OutRespStatusMessage>response;
				throw new Error(statusMessage.payload.status);
			}
			default:
				console.log(`Received unknown message type: ${message.message_type}`);
				throw new Error(`unknownMessageType`);
		}
	}

	public async sendMakeAdmin(adminPassword: string, clientID: string)
	{
		const message: InReqMakeAdminMessage = {
			message_type: `IN_REQ_makeAdmin`,
			correlation_id: crypto.randomUUID(),
			payload: {
				admin_password: adminPassword,
				client_id: clientID,
			},
		};

		const response = await this.sendWebSocketMessage(message);

		switch (response.message_type)
		{
			case `OUT_RESP_status`:
			{
				const statusMessage = <OutRespStatusMessage>response;

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

	public sendChatMessage(message: string)
	{
		if (!this.webSocket) throw new Error(`missingWebsocket`);
		const correlation_id = crypto.randomUUID();
		const sendChatMessage: InReqSendChatMessage = {
			message_type: `IN_REQ_sendChat`,
			correlation_id: correlation_id,
			payload: { message: message },
		};

		this.webSocket.send(JSON.stringify(sendChatMessage));
	}

	public async sendStartGame(roundDuration: number)
	{
		const message: InReqStartGameMessage = {
			message_type: `IN_REQ_startGame`,
			correlation_id: crypto.randomUUID(),
			payload: {
				round_duration: roundDuration,
			},
		};

		const response = await this.sendWebSocketMessage(message);

		switch (response.message_type)
		{
			case `OUT_RESP_status`:
			{
				const statusMessage = <OutRespStatusMessage>response;

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

	public sendQuestion(correlation_id: string, question: string, answers: string[])
	{
		if (!this.webSocket) throw new Error(`missingWebsocket`);
		const sendChatMessage: InRespQuestionMessage = {
			message_type: `IN_RESP_question`,
			correlation_id: correlation_id,
			payload: { question: { question: question, answers: answers } },
		};

		this.webSocket.send(JSON.stringify(sendChatMessage));
	}

	public async sendAnswer(answer: string)
	{
		const message: InReqSendAnswerMessage = {
			message_type: `IN_REQ_sendAnswer`,
			correlation_id: crypto.randomUUID(),
			payload: {
				answer: answer,
			},
		};

		const response = await this.sendWebSocketMessage(message);

		switch (response.message_type)
		{
			case `OUT_RESP_status`:
			{
				const statusMessage = <OutRespStatusMessage>response;

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

	public async sendStopGame()
	{
		const message: InReqStopGameMessage = {
			message_type: `IN_REQ_stopGame`,
			correlation_id: crypto.randomUUID(),
			payload: {},
		};

		const response = await this.sendWebSocketMessage(message);

		switch (response.message_type)
		{
			case `OUT_RESP_status`:
			{
				const statusMessage = <OutRespStatusMessage>response;

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

	private handleReceivedMessage(message: BaseMessage<object, MessageType>)
	{
		switch (message.message_type)
		{
			case `OUT_NOTIF_clientRegistered`:
			{
				const concreteMessage = <OutNotifClientRegisteredMessage>message;
				const event = new CustomEvent<OutNotifClientRegisteredPayload>(`OUT_NOTIF_clientRegistered`, { detail: concreteMessage.payload });
				this.dispatchEvent(event);
				break;
			}
			case `OUT_NOTIF_clientDisconnected`:
			{
				const concreteMessage = <OutNotifClientRegisteredMessage>message;
				const event = new CustomEvent<OutNotifClientRegisteredPayload>(`OUT_NOTIF_clientDisconnected`, { detail: concreteMessage.payload });
				this.dispatchEvent(event);
				break;
			}
			case `OUT_NOTIF_chatSent`:
			{
				const concreteMessage = <OutNotifChatSentMessage>message;
				const event = new CustomEvent<OutNotifChatSentPayload>(`OUT_NOTIF_chatSent`, { detail: concreteMessage.payload });
				this.dispatchEvent(event);
				break;
			}
			case `OUT_NOTIF_adminMade`:
			{
				const concreteMessage = <OutNotifAdminMadeMessage>message;
				const event = new CustomEvent<OutNotifAdminMadePayload>(`OUT_NOTIF_adminMade`, { detail: concreteMessage.payload });
				this.dispatchEvent(event);
				break;
			}
			case `OUT_NOTIF_gameStarted`:
			{
				const concreteMessage = <OutNotifGameStartedMessage>message;
				const event = new CustomEvent<OutNotifGameStartedPayload>(`OUT_NOTIF_gameStarted`, { detail: concreteMessage.payload });
				this.dispatchEvent(event);
				break;
			}
			case `OUT_REQ_question`:
			{
				const concreteMessage = <OutReqQuestionMessage>message;
				const event = new CustomEvent<(question: string, answers: string[]) => void>(`OUT_REQ_question`, { detail: (question: string, answers: string[]) =>
				{
					this.sendQuestion(concreteMessage.correlation_id, question, answers);
				} });
				this.dispatchEvent(event);
				break;
			}
			case `OUT_NOTIF_question`:
			{
				const concreteMessage = <OutNotifQuestionMessage>message;
				const event = new CustomEvent<OutNotifQuestionPayload>(`OUT_NOTIF_question`, { detail: concreteMessage.payload });
				this.dispatchEvent(event);
				break;
			}
			case `OUT_NOTIF_roundEnded`:
			{
				const concreteMessage = <OutNotifRoundEndedMessage>message;
				const event = new CustomEvent<OutNotifRoundEndedPayload>(`OUT_NOTIF_roundEnded`, { detail: concreteMessage.payload });
				this.dispatchEvent(event);
				break;
			}
			case `OUT_NOTIF_clientAnswered`:
			{
				const concreteMessage = <OutNotifClientAnsweredMessage>message;
				const event = new CustomEvent<OutNotifClientAnsweredPayload>(`OUT_NOTIF_clientAnswered`, { detail: concreteMessage.payload });
				this.dispatchEvent(event);
				break;
			}
			case `OUT_NOTIF_gameStopped`:
			{
				const concreteMessage = <OutNotifGameStoppedMessage>message;
				const event = new CustomEvent<OutNotifGameStoppedPayload>(`OUT_NOTIF_gameStopped`, { detail: concreteMessage.payload });
				this.dispatchEvent(event);
				break;
			}
			default:
				console.log(`Received unknown message type: ${message.message_type}`);
		}
	}
}
