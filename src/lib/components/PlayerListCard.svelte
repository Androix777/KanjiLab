<script lang="ts">
    import type { ClientInfo, RoundHistory } from "$lib/types";
    import { flip } from "svelte/animate";
    import { SvelteMap } from "svelte/reactivity";

	type Props = {
		clientInfo: ClientInfo;
		isMe: boolean;
		gameHistory: Array<RoundHistory>;
	};

	const
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		{
			clientInfo = {
				id: `NULL`,
				key: `NULL`,
				name: `NULL`,
				isAdmin: false,
			},
			isMe = false,
			gameHistory = [],
		}: Props = $props();

	let correctCount = $derived(gameHistory.reduce((acc, round) => acc + (round.answers.get(clientInfo.id)?.answerStatus == `Correct` ? 1 : 0), 0) || 0);

	let currentCombo = $derived.by(() =>
	{
		let combo = 0;
		for (let i = gameHistory.length - 1; i >= 0; i--)
		{
			const answerStatus = gameHistory[i].answers.get(clientInfo.id)?.answerStatus;
			if (answerStatus == `Correct`)
			{
				combo++;
			}
			else if (answerStatus == `Incorrect`)
			{
				break;
			}
		}
		return combo;
	});

	let lastAnswers = $derived.by(() =>
	{
		let paddedGameHistory = Array<RoundHistory>();
		paddedGameHistory.push({ question: { wordInfo: { word: ``, meanings: [], readings: [] }, fontName: `` }, questionSvg: ``, answers: new SvelteMap() });
		gameHistory.slice(-3).reverse().map((roundHistory) =>
		{
			paddedGameHistory.push(roundHistory);
		});
		while (paddedGameHistory.length < 4)
		{
			paddedGameHistory.push({ question: { wordInfo: { word: ``, meanings: [], readings: [] }, fontName: `` }, questionSvg: ``, answers: new SvelteMap() });
		}
		return paddedGameHistory;
	});
</script>

<div class="indicator w-full">
	{#if isMe}
	<span class="indicator-item badge badge-primary mx-4 my-1">You</span>
	{/if}
	<div class="m-1 border border-primary bg-base-200 relative w-full" style="border-radius: var(--rounded-box, 1rem /* 16px */);">
		<div class="flex flex-row justify-start items-center overflow-x-hidden min-w-0">
			<div class="flex-none w-16 font-bold text-lg text-base-content">
				{correctCount} ({currentCombo})
			</div>
			<div class="flex-grow font-semibold text-base text-primary}">
				<span class="text-primary">{clientInfo.isAdmin ? `♔ ` : ``}</span>{clientInfo.name}
			</div>
		</div>
		<div class="flex flex-row justify-center items-center overflow-x-hidden min-w-0" style="border-bottom-right-radius: var(--rounded-box, 1rem); border-bottom-left-radius: var(--rounded-box, 1rem);">
			{#each lastAnswers as roundHistory(roundHistory.question)}
				<div class="w-1/2 bg-opacity-50 {roundHistory.answers.get(clientInfo.id)?.answerStatus == `Correct` ? `bg-success text-success-content` : roundHistory.answers.get(clientInfo.id)?.answerStatus == `Incorrect` ? `bg-error text-error-content` : roundHistory.answers.get(clientInfo.id)?.answer ? `bg-warning text-warning-content` : ``}"
					animate:flip={{ duration: 200 }}
					style="min-width: 50%;">
					{roundHistory.answers.get(clientInfo.id)?.answer ? roundHistory.answers.get(clientInfo.id)?.answer : `\xa0`}
				</div>
			{:else}
				<div class="opacity-0">Placeholder</div>
			{/each}
		</div>
	</div>
</div>
