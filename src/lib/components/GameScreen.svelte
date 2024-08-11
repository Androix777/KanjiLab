<script lang="ts">
	import * as wanakana from "wanakana";
	import { themeChange } from 'theme-change';
    import type { RoundHistory, ServerStatus } from "$lib/types";
	import { fade } from 'svelte/transition';
    import { onMount } from "svelte";

	type Props = {
		gameHistory: Array<RoundHistory>;
		clientID: string;
		roundDuration: number;
		serverStatus: ServerStatus;
		onAnswer: (answer: string) => void;
	};

	const
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		{
			gameHistory = [],
			clientID = ``,
			roundDuration = 0,
			serverStatus = `Lobby`,
			onAnswer = () => {},
		}: Props = $props();

	let inputElement: HTMLInputElement;

	let readingInput = $state(``);
	let currentSvgUrl = ``;
	let svgUrl = $derived(() =>
	{
		if (currentSvgUrl)
		{
			URL.revokeObjectURL(currentSvgUrl);
		}
		let blob = new Blob([gameHistory.at(-1)?.question_svg || ``], { type: `image/svg+xml` });
		currentSvgUrl = URL.createObjectURL(blob);
		return currentSvgUrl;
	});

	let currentQuestionInfo = $derived(gameHistory.at(-1)?.question);
	let previousQuestionInfo = $derived(gameHistory.at(-2)?.question);
	let currentAnswerRecord = $derived(gameHistory.at(-1)?.answers.get(clientID));
	let previousAnswerRecord = $derived(gameHistory.at(-2)?.answers.get(clientID));
	let timerValue: number = $state(roundDuration);

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

	$effect(() =>
	{
		if (serverStatus == `AnswerQuestion`)
		{
			timerValue = roundDuration;
		}
	});

	onMount(() =>
	{
		inputElement.focus();
		wanakana.bind(inputElement);
		themeChange(false);
		setInterval(() =>
		{
			if (serverStatus == `AnswerQuestion`)
			{
				timerValue -= 0.01;
			}
		}, 10);
	});
</script>

<div class="flex flex-col flex-grow min-h-0">
	<progress class="progress progress-primary" value={timerValue} max={roundDuration}></progress>

    <div class="flex items-center justify-center flex-none my-4 h-24">
		{#key currentQuestionInfo?.question}
			<div class="text-7xl absolute" transition:fade={{ duration: 200 }}>
				<img src={svgUrl()} alt="">
			</div>
		{/key}
    </div>

	<div class="w-full flex justify-center flex-none my-4">
		<input
			bind:value={readingInput}
			onkeydown={checkWord}
			bind:this={inputElement}
			placeholder={ gameHistory.at(-1)?.answers.get(clientID)?.answer }
			class="input input-bordered input-lg text-center w-3/4 text-3xl placeholder:{ currentAnswerRecord?.answerStatus == `Correct` ? `text-success` : currentAnswerRecord?.answerStatus == `Incorrect` ? `text-error` : `text-warning`}"
		/>
	</div>

	<div class="h-1/2 mt-auto mb-0 w-full flex justify-center flex-grow">
		<div class="card w-full flex-grow border border-base-100">
			{#key previousAnswerRecord?.answer}
				<div class="flex-none divider {previousAnswerRecord?.answerStatus == `Correct` ? `divider-success text-success` : previousAnswerRecord?.answerStatus == `Incorrect` ? `divider-error text-error` : `divider-neutral text-neutral-content`}" in:fade={{ duration: 200 }}>
					{ previousAnswerRecord?.answer }
				</div>
			{/key}
			{#key previousQuestionInfo?.question}
				<div class="flex flex-col space-y-2 text-xl overflow-y-auto flex-grow" in:fade={{ duration: 200 }}>
					<div class="justify-center">
						<div class="">
							{ previousQuestionInfo?.question }
						</div>
						<div class="">
							{ previousQuestionInfo?.answers.join(` `) }
						</div>
					</div>
					<div class="flex-none flex justify-center min-h-0">
						<div>{ previousQuestionInfo?.question ? `Word description` : `` }</div>
					</div>
				</div>
			{/key}
		</div>
	</div>

</div>
