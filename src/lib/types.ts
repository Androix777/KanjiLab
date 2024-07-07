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

export type BaseMessage<T, M extends string> = {
	message_type: M;
	correlation_id: string;
	payload: T;
};

export type RegisterClientPayload = {
	name: string;
};

export type RegisterClientMessage = BaseMessage<RegisterClientPayload, `registerClient`>;
