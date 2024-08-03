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

<div class="card w-3/4 bg-base-200 p-2 overflow-y-auto {previousAnswerStatus == `Correct` ? `bg-success text-success-content` : previousAnswerStatus == `Incorrect` ? `bg-error text-error-content` : `bg-base-200 text-base-content`}">
    <div class="flex flex-col space-y-2 text-xl">
        <div class="justify-center">
			<div class="">
				WordInKanji
			</div>
			<div class="">
				Word Readings
			</div>
        </div>

        <div class="flex-none flex justify-center">
			<div> Word description {currentAnswerStatus.substring(0, 0)} {currentAnswer.substring(0, 0)} {previousAnswer.substring(0, 0)}</div>
        </div>
    </div>
</div>
