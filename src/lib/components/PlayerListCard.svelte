<script lang="ts">
    import type { ClientInfo, RoundHistory } from "$lib/types";
    import { flip } from "svelte/animate";
    import { SvelteMap } from "svelte/reactivity";

	type Props = {
		clientInfo: ClientInfo;
		isMe: boolean;
		gameHistory: Array<RoundHistory>;
		score: number;
	};

	const
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		{
			clientInfo = {
				id: `NULL`,
				name: `NULL`,
				is_admin: false,
			},
			isMe = false,
			gameHistory = [],
			score = 0,
		}: Props = $props();

	let getLastAnswers = $derived(() =>
	{
		let paddedGameHistory = Array<RoundHistory>();
		paddedGameHistory.push({ question: { question: ``, answers: [] }, answers: new SvelteMap() });
		gameHistory.slice(-3).reverse().map((roundHistory) =>
		{
			paddedGameHistory.push(roundHistory);
		});
		while (paddedGameHistory.length < 4)
		{
			paddedGameHistory.push({ question: { question: ``, answers: [] }, answers: new SvelteMap() });
		}
		return paddedGameHistory;
	});
</script>

<div class="m-1 border border-primary bg-base-200 relative" style="border-radius: var(--rounded-box, 1rem /* 16px */);">
	<div class="absolute right-2 top-0 text-primary h-6 text-xs">{isMe ? `You` : ``}</div>
	<div class="flex flex-row justify-start items-center overflow-x-hidden min-w-0">
		<div class="flex-none w-12 font-bold text-lg text-base-content">
			{score}
		</div>
		<div class="flex-grow font-semibold text-base text-primary}">
			<span class="text-primary">{clientInfo.is_admin ? `♔ ` : ``}</span>{clientInfo.name}
		</div>
	</div>
	<div class="flex flex-row justify-center items-center overflow-x-hidden min-w-0" style="border-bottom-right-radius: var(--rounded-box, 1rem); border-bottom-left-radius: var(--rounded-box, 1rem);">
		{#each getLastAnswers() as roundHistory(roundHistory.question)}
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
