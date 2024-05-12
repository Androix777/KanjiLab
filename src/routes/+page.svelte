<script lang="ts">
	import DatabaseService from "$lib/databaseService";
	import * as wanakana from 'wanakana';

	let inputElement: HTMLInputElement;

	let word = $state(``);
	let readings: string[] = $state([]);

	let previousWord = $state(``);
	let previousReadings: string[] = $state([]);

	let readingInput = $state(``);
	let answerStatus = $state(``);

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

	async function checkWord(e: KeyboardEvent)
	{
		const realInput: string = inputElement.value;

		if (e.key != `Enter` && e.key != ` `)
		{
			return;
		}
		previousWord = word;
		previousReadings = readings;
		if (readings.includes(realInput))
		{
			answerStatus = `Correct`;
		}
		else
		{
			answerStatus = `Wrong`;
		}
		await generateWord();
		readingInput = ``;
		return 0;
	}

	$effect(() =>
	{
		inputElement.focus();
		wanakana.bind(inputElement);
		void generateWord();
	});
</script>

<h1>{word}</h1>
<div>
	<input bind:value={readingInput} onkeydown={checkWord} bind:this={inputElement}
	style="
		font-family: 'Yu Gothic UI';
		font-size: 24px;
		padding: 10px;
		width: 75%;"/>
</div>
<div>
	{answerStatus}
</div>
<div>
	{previousWord}
</div>
<div>
	{previousReadings.join(` `)}
</div>
