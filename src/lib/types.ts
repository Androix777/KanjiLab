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

export type MessageType =
	| `IN_REQ_registerClient`
	| `IN_REQ_getClientList`
	| `OUT_RESP_clientList`
	| `OUT_RESP_status`
	| `IN_REQ_sendChat`
	| `OUT_NOTIF_clientRegistered`
	| `OUT_NOTIF_clientDisconnected`
	| `OUT_NOTIF_chatSent`
	| `IN_REQ_makeAdmin`;

export type BaseMessage<T extends object, M extends MessageType> = {
	message_type: M;
	correlation_id: string;
	payload: T;
};

export type RegisterClientPayload = {
	name: string;
};
export type RegisterClientMessage = BaseMessage<RegisterClientPayload, `IN_REQ_registerClient`>;

export type GetClientListPayload = object;
export type GetClientListMessage = BaseMessage<GetClientListPayload, `IN_REQ_getClientList`>;

export type StatusPayload = {
	status: string;
};
export type StatusMessage = BaseMessage<StatusPayload, `OUT_RESP_status`>;

export type ClientListPayload = {
	clients: { id: string; name: string }[];
};
export type ClientListMessage = BaseMessage<ClientListPayload, `OUT_RESP_clientList`>;

export type ClientRegisteredPayload = {
	id: string;
	name: string;
};
export type ClientRegisteredMessage = BaseMessage<ClientRegisteredPayload, `OUT_NOTIF_clientRegistered`>;

export type ClientDisconnectedPayload = {
	id: string;
	name: string;
};
export type ClientDisconnectedMessage = BaseMessage<ClientDisconnectedPayload, `OUT_NOTIF_clientDisconnected`>;

export type SendChatPayload = {
	message: string;
};
export type SendChatMessage = BaseMessage<SendChatPayload, `IN_REQ_sendChat`>;

export type ChatSentPayload = {
	id: string;
	message: string;
};
export type ChatSentMessage = BaseMessage<ChatSentPayload, `OUT_NOTIF_chatSent`>;

export type MakeAdminPayload = {
	admin_password: string;
	client_id: string;
};
export type MakeAdminMessage = BaseMessage<MakeAdminPayload, `IN_REQ_makeAdmin`>;
