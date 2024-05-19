<script lang="ts">
	import DatabaseService from "$lib/databaseService";
	import * as wanakana from "wanakana";
	import { themeChange } from 'theme-change';
    import ThemeSelect from "$lib/components/ThemeSelect.svelte";

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
			readings = words[0].wordReadings.map(reading => reading.reading);
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
	});
</script>

<div class="absolute top-0 left-0 p-4">
	<ThemeSelect/>
</div>

<div class="flex flex-col min-h-screen">
    <div class="flex items-center justify-center flex-grow bg-base-200">
        <div class="text-7xl">
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
            <div class="card w-3/4 bg-base-200 p-4">
                <div class="flex flex-col space-y-2 text-xl">
                    <div class="flex justify-center">
                        {#if answerStatus}
                            {answerStatus}
                        {:else}
                            <div class="opacity-0">Placeholder</div>
                        {/if}
                    </div>

                    <div class="flex justify-center">
                        {#if previousWord}
                            {previousWord} - {previousReadings.join(`   `)}
                        {:else}
                            <div class="opacity-0">Placeholder</div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
