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

<div class="p-2 m-1 rounded-md border-2 border-primary bg-base-300 relative">
	<div class="absolute right-2 top-0 text-success h-6 text-xs">{isMe ? `You` : ``}</div>
	<div class="absolute left-2 top-0 text-error h-6 text-xs">{clientInfo.is_admin ? `Admin` : ``}</div>
	<div class="flex flex-row justify-center items-center overflow-x-hidden min-w-0 pt-2">
		<div class="flex-none w-12 font-bold text-lg text-base-content">
			{score}
		</div>
		<div class="flex-grow font-semibold text-base {clientInfo.is_admin ? `text-error` : `text-primary`}">
			{clientInfo.name}
		</div>
	</div>
	<div class="flex flex-row justify-center items-center overflow-x-hidden min-w-0">
		<div class="w-1/2 {currentAnswerStatus == `Correct` ? `bg-success text-success-content` : currentAnswerStatus == `Incorrect` ? `bg-error text-error-content` : currentAnswer != `` ? `bg-warning text-warning-content` : `bg-base-300 text-base-content`}">
			{#if currentAnswer}
				{currentAnswer}
			{:else}
				<div class="opacity-0">Placeholder</div>
			{/if}
		</div>
		<div class="w-1/2 {previousAnswerStatus == `Correct` ? `bg-success text-success-content` : previousAnswerStatus == `Incorrect` ? `bg-error text-error-content` : `bg-base-300 text-base-content`}">
			{#if previousAnswer}
				{previousAnswer}
			{:else}
				<div class="opacity-0">Placeholder</div>
			{/if}
		</div>
	</div>
</div>
