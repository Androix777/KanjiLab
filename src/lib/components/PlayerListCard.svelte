<script lang="ts">
    import type { AnswerStatus, ClientInfo } from "$lib/types";

	type Props = {
		clientInfo: ClientInfo;
		isMe: boolean;
		currentAnswerStatus: AnswerStatus;
		currentAnswer: string;
		previousAnswerStatus: AnswerStatus;
		previousAnswer: string;
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
			currentAnswerStatus = `Unknown`,
			currentAnswer = `NULL`,
			previousAnswerStatus = `Unknown`,
			previousAnswer = `NULL`,
			score = 0,
		}: Props = $props();
</script>

<div class="m-1 border border-primary bg-base-200 relative" style="border-radius: var(--rounded-box, 1rem /* 16px */);">
	<div class="absolute right-2 top-0 text-primary h-6 text-xs">{isMe ? `You` : ``}</div>
	<div class="flex flex-row justify-center items-center overflow-x-hidden min-w-0">
		<div class="flex-none w-12 font-bold text-lg text-base-content">
			{score}
		</div>
		<div class="flex-grow font-semibold text-base text-primary}">
			<span class="text-primary">{clientInfo.is_admin ? `♔ ` : ``}</span>{clientInfo.name}
		</div>
	</div>
	<div class="flex flex-row justify-center items-center overflow-x-hidden min-w-0" style="border-bottom-right-radius: var(--rounded-box, 1rem); border-bottom-left-radius: var(--rounded-box, 1rem);">
		<div class="w-1/2 bg-opacity-50 {currentAnswerStatus == `Correct` ? `bg-success text-success-content` : currentAnswerStatus == `Incorrect` ? `bg-error text-error-content` : currentAnswer != `` ? `bg-warning text-warning-content` : ``}">
			{#if currentAnswer}
				{currentAnswer}
			{:else}
				<div class="opacity-0">Placeholder</div>
			{/if}
		</div>
		<div class="w-1/2 bg-opacity-50 {previousAnswerStatus == `Correct` ? `bg-success text-success-content` : previousAnswerStatus == `Incorrect` ? `bg-error text-error-content` : ``}">
			{#if previousAnswer}
				{previousAnswer}
			{:else}
				<div class="opacity-0">Placeholder</div>
			{/if}
		</div>
	</div>
</div>
