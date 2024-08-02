<script lang="ts">
    import type { AnswerStatus, ClientInfo } from "$lib/types";

	type Props = {
		clientInfo: ClientInfo;
		isMe: boolean;
		currentAnswerStatus: AnswerStatus;
		currentAnswer: string;
		previousAnswerStatus: AnswerStatus;
		previousAnswer: string;
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
		}: Props = $props();
</script>

<div class="text-primary-content p-2 m-1 rounded {clientInfo.is_admin ? `bg-warning` : `bg-primary`} {isMe ? `border-2 border-accent` : ``}">
	{clientInfo.name}
	<div>
		<div class="flex justify-center">
			{#if currentAnswer}
				{currentAnswer + `: ` + currentAnswerStatus}
			{:else}
				<div class="opacity-0">Placeholder</div>
			{/if}
		</div>
		<div class="flex justify-center">
			{#if previousAnswer}
				{previousAnswer + `: ` + previousAnswerStatus}
			{:else}
				<div class="opacity-0">Placeholder</div>
			{/if}
		</div>
	</div>
</div>
