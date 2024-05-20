<script lang="ts">
	import DatabaseService from "$lib/databaseService";
	import * as wanakana from "wanakana";
	import { themeChange } from 'theme-change';
    import ThemeSelect from "$lib/components/ThemeSelect.svelte";
    import AnswerCard from "$lib/components/AnswerCard.svelte";
	import { FontLoader } from '$lib/FontLoader';

	let inputElement: HTMLInputElement;
	let fontLoader: FontLoader = new FontLoader();

	let word = $state(``);
	let wordFont = $state(``);
	let readings: string[] = $state([]);

	let previousWord = $state(``);
	let previousReadings: string[] = $state([]);

	let readingInput = $state(``);
	let answerStatus = $state(``);

	async function loadFonts()
	{
		await fontLoader.initialize();
		await fontLoader.loadFonts();
	}

	async function generateWord()
	{
		try
		{
			const databaseService = await DatabaseService.getInstance();
			const words = await databaseService.getRandomWords(1);
			word = words[0].word;
			readings = words[0].wordReadings.map(reading => reading.reading);
			wordFont = fontLoader.getRandomFont() ?? ``;
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
		themeChange(false);

		void loadFonts();
	});
</script>

<div class="absolute top-0 left-0 p-4">
	<ThemeSelect/>
</div>

<div class="flex flex-col min-h-screen">
    <div class="flex items-center justify-center flex-grow bg-base-200">
        <div class="text-7xl" style="font-family:'{wordFont}'">
            {word}
        </div>
    </div>

    <div class="flex flex-col items-center justify-center flex-grow space-y-4 bg-base-100 p-4">
        <div class="w-full flex justify-center">
            <input
                bind:value={readingInput}
                onkeydown={checkWord}
                bind:this={inputElement}
                class="input input-bordered input-lg text-center w-3/4 text-3xl"
            />
        </div>

        <div class="w-full flex justify-center">
			<AnswerCard
				answerStatus={answerStatus}
				previousWord={previousWord}
				previousReadings={previousReadings}
				/>
        </div>
    </div>
</div>
