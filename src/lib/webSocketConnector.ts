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
	type GameSettingsData,
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
				if (!message.correlationId) return;

				const callback = this.messagePool.get(message.correlationId);
				if (callback)
				{
					callback(message);
					this.messagePool.delete(message.correlationId);
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

			this.messagePool.set(message.correlationId, (response: BaseMessage<object, MessageType>) =>
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
			messageType: `IN_REQ_registerClient`,
			correlationId: crypto.randomUUID(),
			payload: {
				name: getSettings().userName.get(),
			},
		};

		const response = await this.sendWebSocketMessage(message);

		switch (response.messageType)
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
				console.log(`Received unknown message type: ${message.messageType}`);
				throw new Error(`unknownMessageType`);
		}
	}

	public async sendGetClientListMessage()
	{
		const message: InReqGetClientListMessage = {
			messageType: `IN_REQ_clientList`,
			correlationId: crypto.randomUUID(),
			payload: {},
		};

		const response = await this.sendWebSocketMessage(message);

		switch (response.messageType)
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
				console.log(`Received unknown message type: ${message.messageType}`);
				throw new Error(`unknownMessageType`);
		}
	}

	public async sendMakeAdmin(adminPassword: string, clientID: string)
	{
		const message: InReqMakeAdminMessage = {
			messageType: `IN_REQ_makeAdmin`,
			correlationId: crypto.randomUUID(),
			payload: {
				adminPassword: adminPassword,
				clientId: clientID,
			},
		};

		const response = await this.sendWebSocketMessage(message);

		switch (response.messageType)
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
				console.log(`Received unknown message type: ${message.messageType}`);
				throw new Error(`unknownMessageType`);
		}
	}

	public sendChatMessage(message: string)
	{
		if (!this.webSocket) throw new Error(`missingWebsocket`);
		const correlation_id = crypto.randomUUID();
		const sendChatMessage: InReqSendChatMessage = {
			messageType: `IN_REQ_sendChat`,
			correlationId: correlation_id,
			payload: { message: message },
		};

		this.webSocket.send(JSON.stringify(sendChatMessage));
	}

	public async sendStartGame(gameSettings: GameSettingsData)
	{
		const message: InReqStartGameMessage = {
			messageType: `IN_REQ_startGame`,
			correlationId: crypto.randomUUID(),
			payload: {
				gameSettings: gameSettings,
			},
		};

		const response = await this.sendWebSocketMessage(message);

		switch (response.messageType)
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
				console.log(`Received unknown message type: ${message.messageType}`);
				throw new Error(`unknownMessageType`);
		}
	}

	public sendQuestion(correlation_id: string, question: string, answers: string[], fontName: string, question_svg: string)
	{
		if (!this.webSocket) throw new Error(`missingWebsocket`);
		const message: InRespQuestionMessage = {
			messageType: `IN_RESP_question`,
			correlationId: correlation_id,
			payload: { question: { question: question, answers: answers, fontName: fontName }, questionSvg: question_svg },
		};

		this.webSocket.send(JSON.stringify(message));
	}

	public async sendAnswer(answer: string)
	{
		const message: InReqSendAnswerMessage = {
			messageType: `IN_REQ_sendAnswer`,
			correlationId: crypto.randomUUID(),
			payload: {
				answer: answer,
			},
		};

		const response = await this.sendWebSocketMessage(message);

		switch (response.messageType)
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
				console.log(`Received unknown message type: ${message.messageType}`);
				throw new Error(`unknownMessageType`);
		}
	}

	public async sendStopGame()
	{
		const message: InReqStopGameMessage = {
			messageType: `IN_REQ_stopGame`,
			correlationId: crypto.randomUUID(),
			payload: {},
		};

		const response = await this.sendWebSocketMessage(message);

		switch (response.messageType)
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
				console.log(`Received unknown message type: ${message.messageType}`);
				throw new Error(`unknownMessageType`);
		}
	}

	private handleReceivedMessage(message: BaseMessage<object, MessageType>)
	{
		switch (message.messageType)
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
				const event = new CustomEvent<(question: string, answers: string[], fontName: string, questionSvg: string) => void>(`OUT_REQ_question`, { detail: (question: string, answers: string[], fontName: string, questionSvg: string) =>
				{
					this.sendQuestion(concreteMessage.correlationId, question, answers, fontName, questionSvg);
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
				console.log(`Received unknown message type: ${message.messageType}`);
		}
	}
}
