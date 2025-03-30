import type { SvelteMap } from "svelte/reactivity";

export type GameStats = {
	id: number;
	roundsCount: number;
	roundDuration: number;
	minFrequency: number;
	maxFrequency?: number | null;
	fontId?: number | null;
	font?: string | null;
	dictionaryId: number;
	dictionary: string;
	timestamp: string;
};

export type AnswerStats = {
	id: number;
	gameStatsId: number;
	userId: number;
	user: string;
	word: string;
	wordReading: string;
	duration?: number | null;
	isCorrect: boolean;
	roundIndex: number;
	timestamp: string;
	fontId: number;
	font: string;
};

export type WordPartExample = {
	word: string;
	frequency: number | null;
	reading: string;
};

export type WordPartInfo = {
	wordPart: string;
	wordPartReading: string;
	examples: WordPartExample[];
};

export type ReadingWithParts = {
	reading: string;
	parts: WordPartInfo[];
};

export type WordInfo = {
	word: string;
	meanings: string[][][];
	readings: ReadingWithParts[];
};

export type StatsInfo = {
	correctCount: number;
	wrongCount: number;
};

export type AnswerStreaks = {
	gameId: number;
	length: number;
};

export type User = {
	id: number;
	key: string;
	username: string;
};

export type ClientInfo = {
	id: string;
	key: string;
	name: string;
	isAdmin: boolean;
};

export type QuestionInfo = {
	wordInfo: WordInfo;
	fontName: string;
};

export type AnswerInfo = {
	id: string;
	answer: string;
	isCorrect: boolean;
	answerTime: number;
};

export type FontInfo = {
	fontFile: string;
	isEmbedded: boolean;
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
	answerTime: number | null;
};

export type RoundHistory = {
	question: QuestionInfo;
	questionSvg: string;
	answers: SvelteMap<string, AnswerRecord>;
};

export type GameSettingsData = {
	minFrequency: number;
	maxFrequency: number;
	usingMaxFrequency: boolean;
	roundDuration: number;
	roundsCount: number;
	wordPart: string | null;
	wordPartReading: string | null;
	fontsCount: number;
	firstFontName: string | null;
};

export type AnswerStatus = `Correct` | `Incorrect` | `Unknown`;
export type GameStatus = `Off` | `Connecting` | `Lobby` | `WaitingQuestion` | `AnswerQuestion`;

export type MessageType =
	// IN_REQ
	| `IN_REQ_sendPublicKey`
	| `IN_REQ_verifysignature`
	| `IN_REQ_registerClient`
	| `IN_REQ_clientList`
	| `IN_REQ_sendChat`
	| `IN_REQ_makeAdmin`
	| `IN_REQ_startGame`
	| `IN_REQ_sendAnswer`
	| `IN_REQ_stopGame`
	| `IN_REQ_sendGameSettings`
	// OUT_RESP
	| `OUT_RESP_clientList`
	| `OUT_RESP_status`
	| `OUT_RESP_clientRegistered`
	| `OUT_RESP_signMessage`
	// OUT_REQ
	| `OUT_REQ_question`
	// IN_RESP
	| `IN_RESP_question`
	// OUT_NOTIF
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
export type InReqSendPublicKeyPayload = {
	key: string;
};
export type InReqSendPublicKeyMessage = BaseMessage<InReqSendPublicKeyPayload, `IN_REQ_sendPublicKey`>;

export type InReqVerifySignaturePayload = {
	signature: string;
};
export type InReqVerifySignatureMessage = BaseMessage<InReqVerifySignaturePayload, `IN_REQ_verifysignature`>;

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

export type OutRespSignMessagePayload = {
	message: string;
};
export type OutRespSignMessageMessage = BaseMessage<OutRespSignMessagePayload, `OUT_RESP_signMessage`>;

export type OutRespClientRegisteredPayload = {
	id: string;
	gameSettings: GameSettingsData;
};
export type OutRespClientRegisteredMessage = BaseMessage<OutRespClientRegisteredPayload, `OUT_RESP_clientRegistered`>;

export type OutRespClientListPayload = {
	clients: ClientInfo[];
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
	client: ClientInfo;
};
export type OutNotifClientRegisteredMessage = BaseMessage<OutNotifClientRegisteredPayload, `OUT_NOTIF_clientRegistered`>;

export type OutNotifClientDisconnectedPayload = {
	id: string;
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

export type OutNotifGameStoppedPayload = {
	question: QuestionInfo;
	answers: AnswerInfo[];
};
export type OutNotifGameStoppedMessage = BaseMessage<OutNotifGameStoppedPayload, `OUT_NOTIF_gameStopped`>;

export type OutNotifGameSettingsChangedPayload = {
	gameSettings: GameSettingsData;
};
export type OutNotifGameSettingsChangedMessage = BaseMessage<OutNotifGameSettingsChangedPayload, `OUT_NOTIF_gameSettingsChanged`>;
