import { ServerConnector } from "$lib/webSocketConnector";
import type { AnswerRecord, ClientInfo, FontInfo, OutNotifChatSentPayload, OutNotifClientAnsweredPayload, OutNotifClientDisconnectedPayload, OutNotifClientRegisteredPayload, OutNotifGameStartedPayload, OutNotifQuestionPayload, OutNotifRoundEndedPayload, RoundHistory, ServerStatus } from "./types";
import { getSettings } from "$lib/globalSettings.svelte";
import { SvelteMap } from "svelte/reactivity";
import { invoke } from "@tauri-apps/api/core";
import { GET_FONT_ID, GET_FONT_INFO, GET_SVG_TEXT } from "./tauriFunctions";
import { getRandomFont } from "./FontTools";
import { addAnswerStats, addGameStats, getRandomWords } from "./databaseTools";

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
	public timerValue: number = $state(0);
	public timerInterval: number = 0;

	public roundsCount: number = 0;
	public currentRound: number = 0;
	public currentGameId: number = 0;

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

		this.serverConnector.addEventListener(`socketClosed`, () =>
		{
			this.disconnectFromServer();
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_clientRegistered`, (event) =>
		{
			const customEvent: CustomEvent<OutNotifClientRegisteredPayload> = <CustomEvent<OutNotifClientRegisteredPayload>>event;
			this.clientList.push({ id: customEvent.detail.id, name: customEvent.detail.name, isAdmin: false });
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
				client.isAdmin = true;
				if (client.id == this.id)
				{
					this.isAdmin = true;
				}
			}
			else
			{
				throw new Error(`noAdmin`);
			}
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_gameStarted`, async (event) =>
		{
			const customEvent: CustomEvent<OutNotifGameStartedPayload> = <CustomEvent<OutNotifGameStartedPayload>>event;
			this.roundDuration = customEvent.detail.roundDuration;
			this.roundsCount = customEvent.detail.roundsCount;
			this.currentRound = 0;
			this.gameHistory.length = 0;

			this.currentGameId = await addGameStats(
				customEvent.detail.roundsCount,
				customEvent.detail.roundDuration,
				getSettings().minFrequency.get(),
				getSettings().maxFrequency.get(),
				null,
				1,
			);

			this.isGameStarted = true;
			this.serverStatus = `WaitingQuestion`;
		});
		this.serverConnector.addEventListener(`OUT_REQ_question`, (event) =>
		{
			const customEvent: CustomEvent<(question: string, answers: string[], fontName: string, questionSvg: string) => void> = <CustomEvent<(question: string, answers: string[], fontName: string, questionSvg: string) => void>>event;
			void this.respondToQuestionRequest(customEvent);
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_question`, (event) =>
		{
			const customEvent: CustomEvent<OutNotifQuestionPayload> = <CustomEvent<OutNotifQuestionPayload>>event;
			this.showQuestion(customEvent.detail);
			this.serverStatus = `AnswerQuestion`;

			this.timerValue = this.roundDuration;
			clearInterval(this.timerInterval);
			this.timerInterval = setInterval(() =>
			{
				this.timerValue -= 0.01;
			}, 10);
			this.currentRound++;
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_roundEnded`, (event) =>
		{
			const customEvent: CustomEvent<OutNotifRoundEndedPayload> = <CustomEvent<OutNotifRoundEndedPayload>>event;
			void this.endRound(customEvent.detail);
			this.serverStatus = `WaitingQuestion`;

			clearInterval(this.timerInterval);
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

			clearInterval(this.timerInterval);
		});

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

	public async respondToQuestionRequest(event: CustomEvent<(question: string, answers: string[], fontName: string, questionSvg: string) => void>)
	{
		const question: { question: string; answers: string[]; fontName: string; questionSvg: string } = await this.getQuestion();
		event.detail(question.question, question.answers, question.fontName, question.questionSvg);
	}

	public async getQuestion(maxRetries: number = 3): Promise<{ question: string; answers: string[]; fontName: string; questionSvg: string }>
	{
		for (let attempt = 0; attempt < maxRetries; attempt++)
		{
			try
			{
				const words = await getRandomWords(1);
				const lastWord = words[0];
				const readings = lastWord.readings.map(reading => reading.reading);
				let font: string;
				if (getSettings().selectedFonts.get().length > 0)
				{
					font = getSettings().selectedFonts.get().at(Math.floor(Math.random() * getSettings().selectedFonts.get().length)) || ``;
				}
				else
				{
					font = await getRandomFont();
				}
				const fontInfo: FontInfo = await invoke(GET_FONT_INFO, { fontName: font });
				const svg: string = await invoke(GET_SVG_TEXT, { text: lastWord.word, fontName: font });
				const question: { question: string; answers: string[]; fontName: string; questionSvg: string } = {
					question: lastWord.word,
					answers: readings,
					questionSvg: svg,
					fontName: fontInfo.fullName,
				};
				return question;
			}
			catch (error)
			{
				console.error(`Attempt ${attempt + 1} failed:`, error);
				if (attempt === maxRetries - 1)
				{
					throw new Error(`getQuestionFailed`);
				}
			}
		}
		throw new Error(`UnexpectedErrorInGetQuestion`);
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
				question: ``,
				answers: [],
				fontName: ``,
			},
			questionSvg: questionPayload.questionSvg,
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

	public async endRound(roundResults: OutNotifRoundEndedPayload)
	{
		this.gameHistory[this.gameHistory.length - 1].question = roundResults.question;
		roundResults.answers.forEach((answer) =>
		{
			this.gameHistory[this.gameHistory.length - 1].answers.set(answer.id, {
				answer: answer.answer,
				answerStatus: answer.isCorrect ? `Correct` : `Incorrect`,
			});
		});
		this.clientList.sort((e1, e2) =>
		{
			const e1Score = this.gameHistory.reduce((acc, round) => acc + (round.answers.get(e1.id)?.answerStatus == `Correct` ? 1 : 0), 0);
			const e2Score = this.gameHistory.reduce((acc, round) => acc + (round.answers.get(e2.id)?.answerStatus == `Correct` ? 1 : 0), 0);
			return (e1Score < e2Score) ? 1 : (e1Score > e2Score) ? -1 : 0;
		});

		const word = this.gameHistory.at(-1)?.question.question;
		const answer = this.gameHistory.at(-1)?.answers.get(this.id)?.answer || ``;

		if (word)
		{
			const fontId: number = await invoke(GET_FONT_ID, { name: roundResults.question.fontName });
			await addAnswerStats(this.currentGameId, word, answer, 0, this.gameHistory.at(-1)?.answers.get(this.id)?.answerStatus == `Correct`, fontId);
		}
	}

	public async stopGame()
	{
		await this.serverConnector?.sendStopGame();
	}
}

export default WebSocketClient;
