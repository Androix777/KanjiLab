import { ServerConnector } from "$lib/webSocketConnector";
import type { AnswerStatus, ClientInfo, OutNotifChatSentPayload, OutNotifClientDisconnectedPayload, OutNotifClientRegisteredPayload, OutNotifQuestionPayload } from "./types";
import { getSettings } from "$lib/globalSettings.svelte";
import DatabaseService from "./databaseService";

class WebSocketClient
{
	private static instance: WebSocketClient | null;
	private serverConnector: ServerConnector | null = null;
	public clientList: Array<ClientInfo> = $state([]);
	public chatList: Array<{ name: string; message: string }> = $state([]);

	public connectionStatus: `Disconnected` | `Connecting` | `Connected` = $state(`Disconnected`);
	public isConnectedToSelf: boolean = $state(false);
	public id: string = $state(``);
	public isAdmin: boolean = $state(false);
	public isGameStarted: boolean = $state(false);

	public question: string = $state(``);
	public currentAnswerStatus: AnswerStatus = $state(`Unknown`);
	public previousAnswerStatus: AnswerStatus = $state(`Unknown`);
	public currentAnswer: string = $state(``);
	public previousAnswer: string = $state(``);

	public static getInstance()
	{
		if (this.instance != null) return this.instance;
		WebSocketClient.instance = new WebSocketClient();
		return WebSocketClient.instance;
	}

	public async connectToServer(ipAddress: string)
	{
		this.connectionStatus = `Connecting`;
		this.serverConnector = new ServerConnector();
		try
		{
			await this.serverConnector.connect(ipAddress);
			this.id = await this.serverConnector.sendRegisterClientMessage();
			console.log(this.id);
			this.clientList = await this.serverConnector.sendGetClientListMessage();
		}
		catch (e)
		{
			console.log(e);
			this.disconnectFromServer();
			return;
		}

		this.connectionStatus = `Connected`;

		this.serverConnector.addEventListener(`socketClosed`, () =>
		{
			this.disconnectFromServer();
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_clientRegistered`, (event) =>
		{
			const customEvent: CustomEvent<OutNotifClientRegisteredPayload> = <CustomEvent<OutNotifClientRegisteredPayload>>event;
			this.clientList.push({ id: customEvent.detail.id, name: customEvent.detail.name, is_admin: false });
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_clientDisconnected`, (event) =>
		{
			const customEvent: CustomEvent<OutNotifClientDisconnectedPayload> = <CustomEvent<OutNotifClientDisconnectedPayload>>event;
			this.clientList = this.clientList.filter(client => client.id != customEvent.detail.id);
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_chatSent`, (event) =>
		{
			const customEvent: CustomEvent<OutNotifChatSentPayload> = <CustomEvent<OutNotifChatSentPayload>>event;
			this.chatList.push({ name: this.getClient(customEvent.detail.id).name, message: customEvent.detail.message });
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_adminMade`, (event) =>
		{
			const customEvent: CustomEvent<OutNotifChatSentPayload> = <CustomEvent<OutNotifChatSentPayload>>event;
			const client = this.clientList.find(client => client.id === customEvent.detail.id);
			if (client)
			{
				client.is_admin = true;
			}
			else
			{
				throw new Error(`noAdmin`);
			}
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_gameStarted`, () =>
		{
			this.isGameStarted = true;
		});
		this.serverConnector.addEventListener(`OUT_REQ_question`, (event) =>
		{
			const customEvent: CustomEvent<(question: string, answers: string[]) => void> = <CustomEvent<(question: string, answers: string[]) => void>>event;
			void this.respondToQuestionRequest(customEvent);
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_question`, (event) =>
		{
			const customEvent: CustomEvent<OutNotifQuestionPayload> = <CustomEvent<OutNotifQuestionPayload>>event;
			this.showQuestion(customEvent.detail);
		});
	}

	public disconnectFromServer()
	{
		this.serverConnector?.disconnect();
		this.connectionStatus = `Disconnected`;
		this.clientList = [];
		this.chatList = [];
		this.id = ``;
		this.isAdmin = false;
		this.isGameStarted = false;
	}

	public sendChatMessage(message: string)
	{
		this.serverConnector?.sendChatMessage(message);
	}

	public async respondToQuestionRequest(event: CustomEvent<(question: string, answers: string[]) => void>)
	{
		const question: { question: string; answers: string[] } = await this.getQuestion();
		event.detail(question.question, question.answers);
	}

	public async getQuestion(): Promise<{ question: string; answers: string[] }>
	{
		try
		{
			const databaseService = await DatabaseService.getInstance();
			const words = await databaseService.getRandomWords(1);
			const lastWord = words[0];
			const readings = lastWord.wordReadings.map(reading => reading.reading);
			const question: { question: string; answers: string[] } = {
				question: lastWord.word,
				answers: readings,
			};
			return question;
		}
		catch (error)
		{
			console.error(error);
			throw new Error(`getQuestionFailed`);
		}
	}

	public async makeAdmin()
	{
		await this.serverConnector?.sendMakeAdmin(getSettings().adminPassword, this.id);
		this.isAdmin = true;
	}

	public getClient(id: string)
	{
		return this.clientList.filter(client => client.id == id)[0];
	}

	public async startGame()
	{
		await this.serverConnector?.sendStartGame();
		this.isGameStarted = true;
	}

	public showQuestion(questionPayload: OutNotifQuestionPayload)
	{
		this.question = questionPayload.question;
	}

	public async sendAnswer(answer: string)
	{
		this.previousAnswer = this.currentAnswer;
		this.previousAnswerStatus = this.currentAnswerStatus;
		this.currentAnswer = answer;

		await this.serverConnector?.sendAnswer(answer);
	}
}

export default WebSocketClient;
