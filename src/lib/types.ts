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

// IN REQ
export type InReqRegisterClientPayload = {
	name: string;
};
export type InReqRegisterClientMessage = BaseMessage<InReqRegisterClientPayload, `IN_REQ_registerClient`>;

export type InReqGetClientListPayload = object;
export type InReqGetClientListMessage = BaseMessage<InReqGetClientListPayload, `IN_REQ_getClientList`>;

export type InReqMakeAdminPayload = {
	admin_password: string;
	client_id: string;
};
export type InReqMakeAdminMessage = BaseMessage<InReqMakeAdminPayload, `IN_REQ_makeAdmin`>;

export type InReqSendChatPayload = {
	message: string;
};
export type InReqSendChatMessage = BaseMessage<InReqSendChatPayload, `IN_REQ_sendChat`>;

// OUT RESP
export type OutRespStatusPayload = {
	status: string;
};
export type OutRespStatusMessage = BaseMessage<OutRespStatusPayload, `OUT_RESP_status`>;

export type OutRespClientListPayload = {
	clients: { id: string; name: string }[];
};
export type OutRespClientListMessage = BaseMessage<OutRespClientListPayload, `OUT_RESP_clientList`>;

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
