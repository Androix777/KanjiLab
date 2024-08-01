<script lang="ts">
    import type { AnswerStatus } from "$lib/types";

	type Props = {
		currentAnswerStatus: AnswerStatus;
		currentAnswer: string;
		previousAnswerStatus: AnswerStatus;
		previousAnswer: string;
	};

	const
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		{
			currentAnswerStatus = `Unknown`,
			currentAnswer = `NULL`,
			previousAnswerStatus = `Unknown`,
			previousAnswer = `NULL`,
		}: Props = $props();
</script>

<div class="card w-3/4 bg-base-200 p-4">
    <div class="flex flex-col space-y-2 text-xl">
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
