<script lang="ts">
	import type { RoundHistory } from "$lib/types";
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import { themeChange } from "theme-change";
	import * as wanakana from "wanakana";

	type Props = {
		gameHistory: Array<RoundHistory>;
		clientID: string;
		roundDuration: number;
		timerValue: number;
		roundsCount: number;
		currentRound: number;
		onAnswer: (answer: string) => void;
	};

	const // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	{
		gameHistory,
		clientID,
		roundDuration,
		timerValue,
		roundsCount,
		currentRound,
		onAnswer,
	}: Props = $props();

	let inputElement: HTMLInputElement;

	let readingInput = $state(``);
	let currentSvgUrl = $derived(URL.createObjectURL(new Blob([gameHistory.at(-1)?.questionSvg || ``], { type: `image/svg+xml` })));

	let currentQuestionInfo = $derived(gameHistory.at(-1)?.question);
	let previousQuestionInfo = $derived(gameHistory.at(-2)?.question);
	let currentAnswerRecord = $derived(gameHistory.at(-1)?.answers.get(clientID));
	let previousAnswerRecord = $derived(gameHistory.at(-2)?.answers.get(clientID));

	function checkWord(e: KeyboardEvent)
	{
		const realInput: string = inputElement.value;

		if (e.key != `Enter` && e.key != ` `)
		{
			return;
		}
		e.preventDefault();

		readingInput = ``;
		onAnswer(realInput);

		return 0;
	}

	onMount(() =>
	{
		inputElement.focus();
		wanakana.bind(inputElement);
		themeChange(false);
	});
</script>

<div class="flex flex-col flex-grow min-h-0">
	<progress class="progress progress-primary flex-none" value={timerValue} max={roundDuration}></progress>

	<div>Round {currentRound} of {roundsCount}</div>

	<div class="flex items-center justify-center flex-none my-4 h-36 relative">
		{#key currentQuestionInfo?.wordInfo.word}
			<div class="absolute h-36 top-0 bottom-0">
				<div class="bg-base-content max-h-full" style="mask-image: url({currentSvgUrl}); mask-size: 100% 100%" transition:fade={{ duration: 400 }}>
					<img src={currentSvgUrl} alt="" class="opacity-0 object-contain h-36">
				</div>
			</div>
		{/key}
	</div>

	<div class="w-full flex justify-center flex-none my-4">
		<input
			bind:value={readingInput}
			onkeydown={checkWord}
			bind:this={inputElement}
			placeholder={gameHistory.at(-1)?.answers.get(clientID)?.answer}
			class="input input-bordered input-lg text-center w-3/4 text-3xl placeholder:{ currentAnswerRecord?.answerStatus == `Correct` ? `text-success` : currentAnswerRecord?.answerStatus == `Incorrect` ? `text-error` : `text-warning`}"
		/>
	</div>

	<div class="w-full flex justify-center flex-grow relative">
		{#key [previousQuestionInfo?.wordInfo.word, previousAnswerRecord?.answer]}
			<div class="absolute right-0 left-0 top-0 bottom-0 border border-base-100" transition:fade={{ duration: 400 }}>
				<div
					class="flex-none divider mb-0 mx-2 {previousAnswerRecord?.answerStatus == `Correct` ? `divider-success text-success` : previousAnswerRecord?.answerStatus == `Incorrect` ? `divider-error text-error` : `divider-neutral text-neutral-content`}"
				>
					{previousAnswerRecord?.answer}
				</div>
				<div class="flex flex-col space-y-2 text-xl overflow-y-auto" style="height: 90%">
					<div class="justify-center">
						{#if previousQuestionInfo != null}
							<div class="flex flex-row items-center">
								{#each previousQuestionInfo.wordInfo.readings as reading}
									<div class="flex-grow text-4xl"><ruby>{previousQuestionInfo.wordInfo.word}<rt class="text-2xl mb-1">{reading.reading}</rt></ruby></div>
								{/each}
							</div>
						{/if}
					</div>
					<div class="flex-none flex justify-center min-h-0">
						<div>{previousQuestionInfo?.wordInfo.word ? previousQuestionInfo.wordInfo.meanings[0][0].join(`; `) : ``}</div>
					</div>
					{#if previousQuestionInfo != null}
						{#each previousQuestionInfo.wordInfo.readings as reading}
							{#if reading.parts.length >= 1}
								<div class="divider py-6">{reading.reading}</div>
								{#each reading.parts as part}
									<div class="flex flex-row items-center">
										<div class="flex-none w-1/6">{`${part.wordPart}（${part.wordPartReading}）\u3000\u3000`}</div>
										<div class="divider divider-horizontal"></div>
										<div class="flex-grow">
											{#each part.examples as example}
												<div class="float-left"><ruby>{example.word}<rt class="text-sm mb-1">{example.reading}</rt></ruby>{`\u3000\u3000`}</div>
											{/each}
										</div>
									</div>
								{/each}
							{/if}
						{/each}
					{/if}
				</div>
			</div>
		{/key}
	</div>
</div>
