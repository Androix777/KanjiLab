export type WordWithReadings = {
	id: Uint8Array;
	word: string;
	wordReadings: { id: Uint8Array; reading: string }[];
};

export type WordWithReadingsSQL = {
	word_id: Uint8Array;
	word: string;
	reading_id: Uint8Array;
	word_reading: string;
};
