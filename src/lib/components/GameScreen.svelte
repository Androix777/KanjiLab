<script lang="ts">
	import * as wanakana from "wanakana";
	import { themeChange } from 'theme-change';
    import type { RoundHistory } from "$lib/types";
	import { fade } from 'svelte/transition';
    import { onMount } from "svelte";

	type Props = {
		gameHistory: Array<RoundHistory>;
		clientID: string;
		roundDuration: number;
		timerValue: number;
		roundsCount: number;
		currentRound: number;
		onAnswer: (answer: string) => void;
	};

	const
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
	<progress class="progress progress-primary" value={timerValue} max={roundDuration}></progress>

	<div>Round {currentRound} of {roundsCount}</div>

	<div class="flex-grow"></div>

    <div class="flex items-center justify-center flex-none my-4 h-24">
		{#key currentQuestionInfo?.question}
			<div class="bg-base-content absolute" style="
				mask-image: url({currentSvgUrl});
				mask-size: 100% 100%;"
				transition:fade={{ duration: 400 }}>
				<img src={currentSvgUrl} alt="" class="opacity-0">
			</div>
		{/key}
    </div>

	<div class="flex-grow"></div>

	<div class="w-full flex justify-center flex-none my-4">
		<input
			bind:value={readingInput}
			onkeydown={checkWord}
			bind:this={inputElement}
			placeholder={ gameHistory.at(-1)?.answers.get(clientID)?.answer }
			class="input input-bordered input-lg text-center w-3/4 text-3xl placeholder:{ currentAnswerRecord?.answerStatus == `Correct` ? `text-success` : currentAnswerRecord?.answerStatus == `Incorrect` ? `text-error` : `text-warning`}"
		/>
	</div>

	<div class="flex-grow"></div>

	<div class="h-1/2 w-full flex justify-center flex-none">
		{#key [previousQuestionInfo?.question, previousAnswerRecord?.answer]}
		<div class="absolute w-full flex-grow border border-base-100" transition:fade={{ duration: 400 }}>
				<div class="flex-none divider mx-2 {previousAnswerRecord?.answerStatus == `Correct` ? `divider-success text-success` : previousAnswerRecord?.answerStatus == `Incorrect` ? `divider-error text-error` : `divider-neutral text-neutral-content`}">
					{ previousAnswerRecord?.answer }
				</div>
				<div class="flex flex-col space-y-2 text-xl overflow-y-auto flex-grow">
					<div class="justify-center">
						<div class="text-4xl">
							{ previousQuestionInfo?.question }
						</div>
						<div class="text-4xl">
							{ previousQuestionInfo?.answers.join(` `) }
						</div>
					</div>
					<div class="flex-none flex justify-center min-h-0">
						<div>{ previousQuestionInfo?.question ? previousQuestionInfo.meanings[0][0].join(`; `) : `` }</div>
					</div>
				</div>
		</div>
		{/key}
	</div>

</div>
