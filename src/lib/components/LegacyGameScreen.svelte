<script lang="ts">
	import DatabaseService from "$lib/databaseService";
	import * as wanakana from "wanakana";
	import { themeChange } from 'theme-change';
    import LegacyAnswerCard from "$lib/components/LegacyAnswerCard.svelte";
	import { FontLoader } from '$lib/fontLoader';
    import type { WordInfo } from "$lib/types";

	type Props = {
		fontLoader: FontLoader;
	};

	const
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		{
			fontLoader,
		}: Props = $props();

	let inputElement: HTMLInputElement;

	let lastWord: WordInfo | undefined = $state();
	let wordFont = $state(``);
	let readings: string[] = $state([]);

	let previousWord = $state(``);
	let previousReadings: string[] = $state([]);

	let readingInput = $state(``);
	let answerStatus: `Correct` | `Wrong` | `` = $state(``);

	async function generateWord()
	{
		try
		{
			const databaseService = await DatabaseService.getInstance();
			const words = await databaseService.getRandomWords(1);
			lastWord = words[0];
			readings = lastWord.wordReadings.map(reading => reading.reading);
			wordFont = fontLoader.getRandomFont() ?? ``;
		}
		catch (error)
		{
			console.error(error);
		}
	}

	async function checkWord(e: KeyboardEvent)
	{
		if (lastWord == undefined) return;

		const databaseService = await DatabaseService.getInstance();
		const realInput: string = inputElement.value;

		if (e.key != `Enter` && e.key != ` `)
		{
			return;
		}
		previousWord = lastWord.word;
		previousReadings = readings;

		const readingID = lastWord.wordReadings.find(wr => wr.reading === realInput)?.id || null;
		if (readingID != null)
		{
			await databaseService.addAnswerResult(lastWord.id, readingID);
			answerStatus = `Correct`;
		}
		else
		{
			await databaseService.addAnswerResult(lastWord.id, null);
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
	});
</script>

<div class="flex flex-col min-h-screen">
    <div class="flex items-center justify-center flex-grow bg-base-200">
        <div class="text-7xl" style="font-family:'{wordFont}'">
            {lastWord?.word}
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
			<LegacyAnswerCard
				answerStatus={answerStatus}
				previousWord={previousWord}
				previousReadings={previousReadings}
				/>
        </div>
    </div>
</div>
