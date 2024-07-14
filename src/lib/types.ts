export type WordInfo = {
	id: Uint8Array;
	word: string;
	wordReadings: { id: Uint8Array; reading: string }[];
};

export type WordInfoSQL = {
	word_id: Uint8Array;
	word: string;
	reading_id: Uint8Array;
	word_reading: string;
};

export type StatsInfo = {
	correctCount: number;
	wrongCount: number;
};

export type BaseMessage<T extends object, M extends string> = {
	message_type: M;
	correlation_id: string;
	payload: T;
};

export type RegisterClientPayload = {
	name: string;
};

export type RegisterClientMessage = BaseMessage<RegisterClientPayload, `registerClient`>;

export type GetClientListPayload = object;

export type GetClientListMessage = BaseMessage<GetClientListPayload, `getClientList`>;

export type StatusPayload = {
	status: string;
};

export type StatusMessage = BaseMessage<StatusPayload, `status`>;

export type ClientListPayload = {
	clients: { id: string; name: string }[];
};

export type ClientListMessage = BaseMessage<ClientListPayload, `clientList`>;

export type ClientRegisteredPayload = {
	id: string;
	name: string;
};

export type ClientDisconnectedPayload = {
	id: string;
	name: string;
};

export type ClientRegisteredMessage = BaseMessage<ClientRegisteredPayload, `clientRegistered`>;

export type ClientDisconnectedMessage = BaseMessage<ClientDisconnectedPayload, `clientDisconnected`>;

export type SendChatPayload = {
	message: string;
};

export type SendChatMessage = BaseMessage<SendChatPayload, `sendChat`>;

export type ChatSentPayload = {
	id: string;
	message: string;
};

export type ChatSentMessage = BaseMessage<ChatSentPayload, `chatSent`>;
