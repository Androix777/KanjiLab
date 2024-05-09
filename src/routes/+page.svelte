<script lang="ts">
	import DatabaseService from "$lib/databaseService";

	let word = $state(`Word`);
	let readings: string[] = $state([]);

	let readingInput = $state(`Hello World`);
	let answerStatus = $state(`No answer`);

	async function generateWord()
	{
		try
		{
			const databaseService = await DatabaseService.getInstance();
			const words = await databaseService.getRandomWords(1);
			word = words[0].word;
			readings = words[0].wordReadings;
		}
		catch (error)
		{
			console.error(error);
		}
	}

	async function checkWord()
	{
		if (readings.includes(readingInput))
		{
			answerStatus = `Correct`;
		}
		else
		{
			answerStatus = `Wrong`;
		}
		await generateWord();
		return 0;
	}

	void generateWord();
</script>

<h1>{word}</h1>
<div>
	<input bind:value={readingInput} />
</div>
<div>
	<button onclick={checkWord}>Check Word</button>
</div>
<div>
	{answerStatus}
</div>
<div>
	{word}
</div>
<div>
	{readings.join(` `)}
</div>
