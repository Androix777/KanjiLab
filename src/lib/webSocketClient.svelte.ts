import { ServerConnector } from "$lib/webSocketConnector";
import type { AnswerRecord, ClientInfo, OutNotifChatSentPayload, OutNotifClientAnsweredPayload, OutNotifClientDisconnectedPayload, OutNotifClientRegisteredPayload, OutNotifGameStartedPayload, OutNotifQuestionPayload, OutNotifRoundEndedPayload, RoundHistory, ServerStatus } from "./types";
import { getSettings } from "$lib/globalSettings.svelte";
import DatabaseService from "./databaseService";
import { SvelteMap } from "svelte/reactivity";

class WebSocketClient
{
	private static instance: WebSocketClient | null;
	private serverConnector: ServerConnector | null = null;
	public clientList: Array<ClientInfo> = $state([]);
	public chatList: Array<{ name: string; message: string }> = $state([]);

	public connectionStatus: `Disconnected` | `Connecting` | `Connected` = $state(`Disconnected`);
	public serverStatus: ServerStatus = $state(`Lobby`);
	public isConnectedToSelf: boolean = $state(false);
	public id: string = $state(``);
	public isAdmin: boolean = $state(false);
	public isGameStarted: boolean = $state(false);

	public question: string = $state(``);
	public gameHistory: Array<RoundHistory> = $state([]);

	public roundDuration: number = 0;

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
		this.serverConnector.addEventListener(`OUT_NOTIF_gameStarted`, (event) =>
		{
			const customEvent: CustomEvent<OutNotifGameStartedPayload> = <CustomEvent<OutNotifGameStartedPayload>>event;
			this.roundDuration = customEvent.detail.round_duration;
			this.gameHistory.length = 0;
			this.isGameStarted = true;
			this.serverStatus = `WaitingQuestion`;
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
			this.serverStatus = `AnswerQuestion`;
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_roundEnded`, (event) =>
		{
			const customEvent: CustomEvent<OutNotifRoundEndedPayload> = <CustomEvent<OutNotifRoundEndedPayload>>event;
			this.endRound(customEvent.detail);
			this.serverStatus = `WaitingQuestion`;
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_clientAnswered`, (event) =>
		{
			const customEvent: CustomEvent<OutNotifClientAnsweredPayload> = <CustomEvent<OutNotifClientAnsweredPayload>>event;
			if (customEvent.detail.id != this.id)
			{
				this.addClientAnswer(customEvent.detail.id);
			}
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_gameStopped`, () =>
		{
			this.isGameStarted = false;
			this.gameHistory = [];
			this.serverStatus = `Lobby`;
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
		this.gameHistory = [];
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
		await this.serverConnector?.sendMakeAdmin(getSettings().adminPassword.get(), this.id);
		this.isAdmin = true;
	}

	public getClient(id: string)
	{
		return this.clientList.filter(client => client.id == id)[0];
	}

	public async startGame()
	{
		await this.serverConnector?.sendStartGame(getSettings().roundDuration.get(), getSettings().roundsCount.get());
		this.isGameStarted = true;
	}

	public showQuestion(questionPayload: OutNotifQuestionPayload)
	{
		this.gameHistory.push({
			question: {
				question: questionPayload.question,
				answers: [],
			},
			answers: new SvelteMap<string, AnswerRecord>(),
		});
		this.gameHistory[this.gameHistory.length - 1].answers.set(this.id, {
			answer: ``,
			answerStatus: `Unknown`,
		});
	}

	public async sendAnswer(answer: string)
	{
		this.gameHistory[this.gameHistory.length - 1].answers.set(this.id, {
			answer: answer,
			answerStatus: `Unknown`,
		});

		await this.serverConnector?.sendAnswer(answer);
	}

	public addClientAnswer(clientID: string)
	{
		this.gameHistory.at(-1)?.answers.set(clientID, {
			answer: `?`,
			answerStatus: `Unknown`,
		});
	}

	public endRound(roundResults: OutNotifRoundEndedPayload)
	{
		this.gameHistory[this.gameHistory.length - 1].question = roundResults.question;
		roundResults.answers.forEach((answer) =>
		{
			this.gameHistory[this.gameHistory.length - 1].answers.set(answer.id, {
				answer: answer.answer,
				answerStatus: answer.is_correct ? `Correct` : `Incorrect`,
			});
		});
		this.clientList.sort((e1, e2) =>
		{
			const e1Score = this.gameHistory.reduce((acc, round) => acc + (round.answers.get(e1.id)?.answerStatus == `Correct` ? 1 : 0), 0);
			const e2Score = this.gameHistory.reduce((acc, round) => acc + (round.answers.get(e2.id)?.answerStatus == `Correct` ? 1 : 0), 0);
			return (e1Score < e2Score) ? 1 : (e1Score > e2Score) ? -1 : 0;
		});
	}

	public async stopGame()
	{
		await this.serverConnector?.sendStopGame();
	}
}

export default WebSocketClient;
