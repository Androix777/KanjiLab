export function WordWithReadingsSQLMap(sql: WordWithReadingsSQL)
{
	const result: WordWithReadings =
	{
		word: sql.word,
		wordReadings: sql.wordReadings.split(`,`),
	};
	return result;
}

export type Word =
{
	id: number;
	text: string;
};

export type WordWithReadings =
{
	word: string;
	wordReadings: string[];
};

export type WordWithReadingsSQL =
{
	word: string;
	wordReadings: string;
};
