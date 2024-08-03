<script lang="ts">
	import * as wanakana from "wanakana";
	import { themeChange } from 'theme-change';
    import AnswerCard from "$lib/components/AnswerCard.svelte";
    import type { AnswerStatus } from "$lib/types";

	type Props = {
		question: string;
		currentAnswerStatus: AnswerStatus;
		currentAnswer: string;
		previousAnswerStatus: AnswerStatus;
		previousAnswer: string;
		onAnswer: (answer: string) => void;
	};

	const
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		{
			question = `NULL`,
			currentAnswerStatus = `Unknown`,
			currentAnswer = `NULL`,
			previousAnswerStatus = `Unknown`,
			previousAnswer = `NULL`,
			onAnswer = () => {},
		}: Props = $props();

	let inputElement: HTMLInputElement;

	let readingInput = $state(``);

	function checkWord(e: KeyboardEvent)
	{
		const realInput: string = inputElement.value;

		if (e.key != `Enter` && e.key != ` `)
		{
			return;
		}

		readingInput = ``;
		onAnswer(realInput);

		return 0;
	}

	$effect(() =>
	{
		inputElement.focus();
		wanakana.bind(inputElement);
		themeChange(false);
	});
</script>

<div class="flex flex-col flex-grow">
    <div class="flex items-center justify-center flex-grow bg-base-200">
        <div class="text-7xl">
            {question}
        </div>
    </div>

    <div class="flex flex-col items-center justify-center flex-grow space-y-4 bg-base-100 p-4">
        <div class="w-full flex justify-center">
            <input
                bind:value={readingInput}
                onkeydown={checkWord}
                bind:this={inputElement}
				placeholder={currentAnswer}
                class="input input-bordered input-lg text-center w-3/4 text-3xl"
            />
        </div>

        <div class="h-1/2 w-full flex justify-center min-h-0">
			<AnswerCard
				currentAnswerStatus={currentAnswerStatus}
				currentAnswer={currentAnswer}
				previousAnswerStatus={previousAnswerStatus}
				previousAnswer={previousAnswer}
				/>
        </div>
    </div>
</div>
