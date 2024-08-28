import type { SvelteMap } from "svelte/reactivity";

export type WordInfo = {
	id: number;
	word: string;
	meanings: string[][][];
	readings: { id: number; reading: string }[];
};

export type StatsInfo = {
	correctCount: number;
	wrongCount: number;
};

export type AnswerStreaks = {
	gameId: number;
	length: number;
};

export type ClientInfo = {
	id: string;
	name: string;
	isAdmin: boolean;
};

export type QuestionInfo = {
	question: string;
	answers: string[];
	meanings: string[][][];
	fontName: string;
};

export type AnswerInfo = {
	id: string;
	answer: string;
	isCorrect: boolean;
};

export type FontInfo = {
	fontFile: string;
	copyrightNotice: string;
	family: string;
	subfamily: string;
	uniqueId: string;
	fullName: string;
	version: string;
	postScriptName: string;
	trademark: string;
	manufacturer: string;
	designer: string;
	description: string;
	vendorUrl: string;
	designerUrl: string;
	license: string;
	licenseUrl: string;
	typographicFamily: string;
	typographicSubfamily: string;
	compatibleFull: string;
	sampleText: string;
	postScriptCid: string;
	wwsFamily: string;
	wwsSubfamily: string;
	lightBackgroundPalette: string;
	darkBackgroundPalette: string;
	variationsPostScriptNamePrefix: string;
	numGlyphs: number;
	unitsPerEm: number;
};

export type AnswerRecord = {
	answer: string;
	answerStatus: AnswerStatus;
};

export type RoundHistory = {
	question: QuestionInfo;
	questionSvg: string;
	answers: SvelteMap<string, AnswerRecord>;
};

export type GameSettingsData = {
	minFrequency: number;
	maxFrequency: number;
	roundDuration: number;
	roundsCount: number;
	wordPart: string | null;
	fontsCount: number;
	firstFontName: string | null;
};

export type AnswerStatus = `Correct` | `Incorrect` | `Unknown`;
export type GameStatus = `Off` | `Connecting` | `Lobby` | `WaitingQuestion` | `AnswerQuestion`;

export type MessageType =
	| `IN_REQ_registerClient`
	| `IN_REQ_clientList`
	| `IN_REQ_sendChat`
	| `IN_REQ_makeAdmin`
	| `IN_REQ_startGame`
	| `IN_REQ_sendAnswer`
	| `IN_REQ_stopGame`
	| `IN_REQ_sendGameSettings`

	| `OUT_RESP_clientList`
	| `OUT_RESP_status`
	| `OUT_RESP_clientRegistered`

	| `OUT_REQ_question`

	| `IN_RESP_question`

	| `OUT_NOTIF_clientRegistered`
	| `OUT_NOTIF_clientDisconnected`
	| `OUT_NOTIF_chatSent`
	| `OUT_NOTIF_adminMade`
	| `OUT_NOTIF_gameStarted`
	| `OUT_NOTIF_question`
	| `OUT_NOTIF_roundEnded`
	| `OUT_NOTIF_clientAnswered`
	| `OUT_NOTIF_gameStopped`
	| `OUT_NOTIF_gameSettingsChanged`;

export type BaseMessage<T extends object, M extends MessageType> = {
	messageType: M;
	correlationId: string;
	payload: T;
};

// IN REQ
export type InReqRegisterClientPayload = {
	name: string;
};
export type InReqRegisterClientMessage = BaseMessage<InReqRegisterClientPayload, `IN_REQ_registerClient`>;

export type InReqGetClientListPayload = object;
export type InReqGetClientListMessage = BaseMessage<InReqGetClientListPayload, `IN_REQ_clientList`>;

export type InReqMakeAdminPayload = {
	adminPassword: string;
	clientId: string;
};
export type InReqMakeAdminMessage = BaseMessage<InReqMakeAdminPayload, `IN_REQ_makeAdmin`>;

export type InReqSendChatPayload = {
	message: string;
};
export type InReqSendChatMessage = BaseMessage<InReqSendChatPayload, `IN_REQ_sendChat`>;

export type InReqStartGamePayload = {
	gameSettings: GameSettingsData;
};
export type InReqStartGameMessage = BaseMessage<InReqStartGamePayload, `IN_REQ_startGame`>;

export type InReqSendAnswerPayload = {
	answer: string;
};
export type InReqSendAnswerMessage = BaseMessage<InReqSendAnswerPayload, `IN_REQ_sendAnswer`>;

export type InReqStopGamePayload = object;
export type InReqStopGameMessage = BaseMessage<InReqStopGamePayload, `IN_REQ_stopGame`>;

export type InReqSendGameSettingsPayload = {
	gameSettings: GameSettingsData;
};
export type InReqSendGameSettingsMessage = BaseMessage<InReqSendGameSettingsPayload, `IN_REQ_sendGameSettings`>;

// OUT RESP
export type OutRespStatusPayload = {
	status: string;
};
export type OutRespStatusMessage = BaseMessage<OutRespStatusPayload, `OUT_RESP_status`>;

export type OutRespClientRegisteredPayload = {
	id: string;
	gameSettings: GameSettingsData;
};
export type OutRespClientRegisteredMessage = BaseMessage<OutRespClientRegisteredPayload, `OUT_RESP_clientRegistered`>;

export type OutRespClientListPayload = {
	clients:
	{
		id: string;
		name: string;
		isAdmin: boolean;
	}[];
};
export type OutRespClientListMessage = BaseMessage<OutRespClientListPayload, `OUT_RESP_clientList`>;
// OUT REQ

export type OutReqQuestionPayload = object;
export type OutReqQuestionMessage = BaseMessage<OutReqQuestionPayload, `OUT_REQ_question`>;

// IN RESP

export type InRespQuestionPayload = {
	question: QuestionInfo;
	questionSvg: string;
};
export type InRespQuestionMessage = BaseMessage<InRespQuestionPayload, `IN_RESP_question`>;

// OUT NOTIF
export type OutNotifClientRegisteredPayload = {
	id: string;
	name: string;
};
export type OutNotifClientRegisteredMessage = BaseMessage<OutNotifClientRegisteredPayload, `OUT_NOTIF_clientRegistered`>;

export type OutNotifClientDisconnectedPayload = {
	id: string;
	name: string;
};
export type OutNotifClientDisconnectedMessage = BaseMessage<OutNotifClientDisconnectedPayload, `OUT_NOTIF_clientDisconnected`>;

export type OutNotifChatSentPayload = {
	id: string;
	message: string;
};
export type OutNotifChatSentMessage = BaseMessage<OutNotifChatSentPayload, `OUT_NOTIF_chatSent`>;

export type OutNotifAdminMadePayload = {
	id: string;
};
export type OutNotifAdminMadeMessage = BaseMessage<OutNotifAdminMadePayload, `OUT_NOTIF_adminMade`>;

export type OutNotifGameStartedPayload = {
	gameSettings: GameSettingsData;
};
export type OutNotifGameStartedMessage = BaseMessage<OutNotifGameStartedPayload, `OUT_NOTIF_gameStarted`>;

export type OutNotifQuestionPayload = {
	questionSvg: string;
};
export type OutNotifQuestionMessage = BaseMessage<OutNotifQuestionPayload, `OUT_NOTIF_question`>;

export type OutNotifRoundEndedPayload = {
	question: QuestionInfo;
	answers: AnswerInfo[];
};
export type OutNotifRoundEndedMessage = BaseMessage<OutNotifRoundEndedPayload, `OUT_NOTIF_roundEnded`>;

export type OutNotifClientAnsweredPayload = {
	id: string;
};
export type OutNotifClientAnsweredMessage = BaseMessage<OutNotifClientAnsweredPayload, `OUT_NOTIF_clientAnswered`>;

export type OutNotifGameStoppedPayload = object;
export type OutNotifGameStoppedMessage = BaseMessage<OutNotifGameStoppedPayload, `OUT_NOTIF_gameStopped`>;

export type OutNotifGameSettingsChangedPayload = {
	gameSettings: GameSettingsData;
};
export type OutNotifGameSettingsChangedMessage = BaseMessage<OutNotifGameSettingsChangedPayload, `OUT_NOTIF_gameSettingsChanged`>;
