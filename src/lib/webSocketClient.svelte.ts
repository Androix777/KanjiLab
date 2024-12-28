import { getSettings } from "$lib/globalSettings.svelte";
import { ServerConnector } from "$lib/webSocketConnector";
import { SvelteMap } from "svelte/reactivity";
import { createAccount, getAccounts, signMessage } from "./cryptoTools";
import { addAnswerStats, addGameStats, getAnswerStatsByGame, getFontId, getGameStats, getRandomWords } from "./databaseTools";
import { getFontInfo, getRandomFont, getSVGText } from "./fontTools";
import type {
	AnswerRecord,
	AnswerStats,
	ClientInfo,
	FontInfo,
	GameSettingsData,
	GameStats,
	GameStatus,
	InRespQuestionPayload,
	OutNotifChatSentPayload,
	OutNotifClientAnsweredPayload,
	OutNotifClientDisconnectedPayload,
	OutNotifClientRegisteredPayload,
	OutNotifGameSettingsChangedPayload,
	OutNotifGameStartedPayload,
	OutNotifQuestionPayload,
	OutNotifRoundEndedPayload,
	RoundHistory,
} from "./types";

class WebSocketClient
{
	public gameStatus: GameStatus = $state(`Off`);
	public isConnectedToSelf: boolean = $state(true);
	public clientList: Array<ClientInfo> = $state([]);
	public chatList: Array<{ name: string; message: string }> = $state([]);
	public id: string = $state(``);
	public isAdmin: boolean = $state(false);
	public gameHistory: Array<RoundHistory> = $state([]);
	public timerValue: number = $state(0);
	public currentRound: number = 0;

	public onlineFirstFontName: string = $state(``);
	public onlineFontsCount: number = $state(0);

	private static instance: WebSocketClient | null;
	private serverConnector: ServerConnector = new ServerConnector();
	private timerIntervalId: number = 0;
	public lastGameId: number = $state(0);

	public static getInstance()
	{
		if (this.instance != null) return this.instance;
		WebSocketClient.instance = new WebSocketClient();
		return WebSocketClient.instance;
	}

	public async connectToServer(ipAddress: string)
	{
		this.gameStatus = `Connecting`;

		this.serverConnector = new ServerConnector();

		this.serverConnector.addEventListener(`socketClosed`, () =>
		{
			this.handleSocketClosed();
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_clientRegistered`, (event) =>
		{
			this.handleNotifClientRegistered(event);
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_clientDisconnected`, (event) =>
		{
			this.handleNotifClientDisconnected(event);
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_chatSent`, (event) =>
		{
			this.handleNotifChatSent(event);
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_adminMade`, (event) =>
		{
			this.handleNotifAdminMade(event);
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_gameStarted`, (event) =>
		{
			void this.handleNotifGameStarted(event);
		});
		this.serverConnector.addEventListener(`OUT_REQ_question`, (event) =>
		{
			void this.handleReqQuestion(event);
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_question`, (event) =>
		{
			this.handleNotifQuestion(event);
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_roundEnded`, (event) =>
		{
			void this.handleNotifRoundEnded(event);
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_clientAnswered`, (event) =>
		{
			this.handleNotifClientAnswered(event);
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_gameStopped`, () =>
		{
			this.handleNotifGameStopped();
		});
		this.serverConnector.addEventListener(`OUT_NOTIF_gameSettingsChanged`, (event) =>
		{
			this.handleNotifGameSettingsChanged(event);
		});

		try
		{
			await this.serverConnector.connect(ipAddress);

			let accounts = await getAccounts();
			if (accounts.length == 0)
			{
				await createAccount(getSettings().userName.get());
			}
			accounts = await getAccounts();
			const message = await this.sendPublicKeyMessage(accounts[getSettings().currentAccount.get()].publicKey);
			const sign = await signMessage(accounts[getSettings().currentAccount.get()].publicKey, message);
			await this.sendVerifySignatureMessage(sign);

			const payload = await this.serverConnector.sendRegisterClientMessage();
			this.id = payload.id;
			if (!this.isConnectedToSelf)
			{
				this.setGameSettings(payload.gameSettings);
			}
			else
			{
				await this.sendNewSettings();
			}
			this.clientList = await this.serverConnector.sendGetClientListMessage();
		}
		catch (e)
		{
			console.log(e);
			this.disconnectFromServer();
			return;
		}

		this.gameStatus = `Lobby`;
	}

	public disconnectFromServer()
	{
		this.serverConnector.disconnect();
		this.gameStatus = `Off`;
		this.clientList = [];
		this.chatList = [];
		this.id = ``;
		this.isAdmin = false;
		this.gameHistory = [];
		this.isConnectedToSelf = true;
		this.lastGameId = 0;
	}

	public async sendPublicKeyMessage(key: string)
	{
		return await this.serverConnector.sendPublicKeyMessage(key);
	}

	public async sendVerifySignatureMessage(signature: string)
	{
		await this.serverConnector.sendVerifySignatureMessage(signature);
	}

	public async sendChatMessage(message: string)
	{
		await this.serverConnector.sendChatMessage(message);
	}

	public async makeAdmin()
	{
		await this.serverConnector.sendMakeAdmin(getSettings().adminPassword.get(), this.id);
		this.isAdmin = true;
	}

	public async startGame()
	{
		await this.serverConnector.sendStartGame(this.getGameSettings());
	}

	public async sendAnswer(answer: string)
	{
		this.gameHistory[this.gameHistory.length - 1].answers.set(this.id, {
			answer: answer,
			answerStatus: `Unknown`,
			answerTime: null,
		});

		await this.serverConnector.sendAnswer(answer);
	}

	public async stopGame()
	{
		await this.serverConnector.sendStopGame();
	}

	public async sendNewSettings()
	{
		await this.serverConnector.sendNewSettings(this.getGameSettings());
	}

	public async getCurrentGameStats(): Promise<GameStats>
	{
		return getGameStats(this.lastGameId);
	}
	public async getCurrentGameAnswerStats(): Promise<AnswerStats[]>
	{
		return getAnswerStatsByGame(this.lastGameId);
	}

	// Private

	private getClient(id: string)
	{
		return this.clientList.filter(client => client.id == id)[0];
	}

	private getGameSettings(): GameSettingsData
	{
		const fontsCount = getSettings().selectedFonts.get().length;
		const font = fontsCount == 0 ? null : getSettings().selectedFonts.get()[0];
		const fontInfo: FontInfo | null = font ? getFontInfo(font) : null;

		const data: GameSettingsData = {
			minFrequency: getSettings().minFrequency.get(),
			maxFrequency: getSettings().maxFrequency.get(),
			usingMaxFrequency: getSettings().usingMaxFrequency.get(),
			roundDuration: getSettings().roundDuration.get(),
			roundsCount: getSettings().roundsCount.get(),
			wordPart: getSettings().wordPart.get() == `` ? null : getSettings().wordPart.get(),
			wordPartReading: getSettings().wordPartReading.get() == `` ? null : getSettings().wordPartReading.get(),
			fontsCount: fontsCount,
			firstFontName: fontInfo?.fullName ?? null,
		};

		return data;
	}

	private setGameSettings(gameSettings: GameSettingsData)
	{
		getSettings().minFrequency.set(gameSettings.minFrequency);
		getSettings().maxFrequency.set(gameSettings.maxFrequency);
		getSettings().usingMaxFrequency.set(gameSettings.usingMaxFrequency);
		getSettings().roundDuration.set(gameSettings.roundDuration);
		getSettings().roundsCount.set(gameSettings.roundsCount);
		getSettings().wordPart.set(gameSettings.wordPart || ``);
		getSettings().wordPartReading.set(gameSettings.wordPartReading || ``);

		this.onlineFirstFontName = gameSettings.firstFontName || ``;
		this.onlineFontsCount = gameSettings.fontsCount;
	}

	// Handlers

	private handleSocketClosed()
	{
		this.disconnectFromServer();
	}

	private handleNotifClientRegistered(event: Event)
	{
		const customEvent: CustomEvent<OutNotifClientRegisteredPayload> = <CustomEvent<OutNotifClientRegisteredPayload>> event;
		this.clientList.push(customEvent.detail.client);
	}

	private handleNotifClientDisconnected(event: Event)
	{
		const customEvent: CustomEvent<OutNotifClientDisconnectedPayload> = <CustomEvent<OutNotifClientDisconnectedPayload>> event;
		this.clientList = this.clientList.filter(client => client.id != customEvent.detail.id);
	}

	private handleNotifChatSent(event: Event)
	{
		const customEvent: CustomEvent<OutNotifChatSentPayload> = <CustomEvent<OutNotifChatSentPayload>> event;
		this.chatList.push({ name: this.getClient(customEvent.detail.id).name, message: customEvent.detail.message });
	}

	private handleNotifAdminMade(event: Event)
	{
		const customEvent: CustomEvent<OutNotifChatSentPayload> = <CustomEvent<OutNotifChatSentPayload>> event;
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
	}

	private async handleNotifGameStarted(event: Event)
	{
		const customEvent: CustomEvent<OutNotifGameStartedPayload> = <CustomEvent<OutNotifGameStartedPayload>> event;
		this.currentRound = 0;
		this.gameHistory.length = 0;

		let fontID: number | null = null;
		if (this.isConnectedToSelf)
		{
			const fontsCount = getSettings().selectedFonts.get().length;
			if (fontsCount == 1)
			{
				const fontFile = getSettings().selectedFonts.get().at(0);
				const fontInfo = fontFile ? getFontInfo(fontFile) : null;
				fontID = fontInfo ? await getFontId(fontInfo.fullName) : null;
			}
		}
		else
		{
			fontID = await getFontId(this.onlineFirstFontName);
		}

		this.lastGameId = await addGameStats(
			customEvent.detail.gameSettings.roundsCount,
			customEvent.detail.gameSettings.roundDuration * 1000,
			getSettings().minFrequency.get(),
			getSettings().maxFrequency.get(),
			fontID,
			1,
		);

		this.gameStatus = `WaitingQuestion`;
	}

	private async handleReqQuestion(event: Event)
	{
		const customEvent: CustomEvent<(question: InRespQuestionPayload) => void> = <CustomEvent<(question: InRespQuestionPayload) => void>> event;

		const maxRetries = 3;
		for (let attempt = 0; attempt < maxRetries; attempt++)
		{
			try
			{
				const words = await getRandomWords(1);
				const lastWord = words[0];
				let font: string;
				if (getSettings().selectedFonts.get().length > 0)
				{
					font = getSettings().selectedFonts.get().at(Math.floor(Math.random() * getSettings().selectedFonts.get().length)) || ``;
				}
				else
				{
					font = await getRandomFont();
				}
				const fontInfo: FontInfo | null = getFontInfo(font);
				if (fontInfo == null)
				{
					throw new Error(`getQuestionFailed`);
				}
				const svg: string = await getSVGText(lastWord.word, font);
				const question: InRespQuestionPayload = {
					question: {
						wordInfo: lastWord,
						fontName: fontInfo.fullName,
					},
					questionSvg: svg,
				};
				customEvent.detail(question);
				return;
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

	private handleNotifQuestion(event: Event)
	{
		const customEvent: CustomEvent<OutNotifQuestionPayload> = <CustomEvent<OutNotifQuestionPayload>> event;
		this.gameHistory.push({
			question: {
				wordInfo: { word: ``, meanings: [], readings: [] },
				fontName: ``,
			},
			questionSvg: customEvent.detail.questionSvg,
			answers: new SvelteMap<string, AnswerRecord>(),
		});
		this.gameHistory[this.gameHistory.length - 1].answers.set(this.id, {
			answer: ``,
			answerStatus: `Unknown`,
			answerTime: null,
		});
		this.gameStatus = `AnswerQuestion`;

		this.timerValue = getSettings().roundDuration.get();
		clearInterval(this.timerIntervalId);
		this.timerIntervalId = <number> <unknown> setInterval(() =>
		{
			this.timerValue -= 0.01;
		}, 10);
		this.currentRound++;
	}

	private async handleNotifRoundEnded(event: Event)
	{
		const customEvent: CustomEvent<OutNotifRoundEndedPayload> = <CustomEvent<OutNotifRoundEndedPayload>> event;
		this.gameHistory[this.gameHistory.length - 1].question = customEvent.detail.question;
		customEvent.detail.answers.forEach((answer) =>
		{
			this.gameHistory[this.gameHistory.length - 1].answers.set(answer.id, {
				answer: answer.answer,
				answerStatus: answer.isCorrect ? `Correct` : `Incorrect`,
				answerTime: answer.answerTime,
			});
		});
		this.clientList.sort((e1, e2) =>
		{
			const e1Score = this.gameHistory.reduce((acc, round) => acc + (round.answers.get(e1.id)?.answerStatus == `Correct` ? 1 : 0), 0);
			const e2Score = this.gameHistory.reduce((acc, round) => acc + (round.answers.get(e2.id)?.answerStatus == `Correct` ? 1 : 0), 0);
			return (e1Score < e2Score) ? 1 : (e1Score > e2Score) ? -1 : 0;
		});

		const questionInfo = this.gameHistory.at(-1)?.question;
		const fontId = await getFontId(customEvent.detail.question.fontName);

		this.clientList.forEach(async (client) =>
		{
			let answer = this.gameHistory.at(-1)?.answers.get(client.id);
			if (answer && questionInfo)
			{
				await addAnswerStats(this.lastGameId, client.key, client.name, questionInfo.wordInfo.word, answer.answer, answer.answerTime, answer.answerStatus == `Correct`, fontId);
			}
		});

		this.gameStatus = `WaitingQuestion`;
	}

	private handleNotifClientAnswered(event: Event)
	{
		const customEvent: CustomEvent<OutNotifClientAnsweredPayload> = <CustomEvent<OutNotifClientAnsweredPayload>> event;
		if (customEvent.detail.id != this.id)
		{
			this.gameHistory.at(-1)?.answers.set(customEvent.detail.id, {
				answer: `?`,
				answerStatus: `Unknown`,
				answerTime: null,
			});
		}
	}

	private handleNotifGameStopped()
	{
		this.gameHistory = [];
		this.gameStatus = `Lobby`;

		clearInterval(this.timerIntervalId);
	}

	private handleNotifGameSettingsChanged(event: Event)
	{
		const customEvent: CustomEvent<OutNotifGameSettingsChangedPayload> = <CustomEvent<OutNotifGameSettingsChangedPayload>> event;
		this.setGameSettings(customEvent.detail.gameSettings);
	}
}

export default WebSocketClient;
