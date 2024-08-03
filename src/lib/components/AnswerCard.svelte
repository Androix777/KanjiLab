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

<div class="card w-full flex-grow border border-base-100">
    <div class="flex-none divider {previousAnswerStatus == `Correct` ? `divider-success` : previousAnswerStatus == `Incorrect` ? `divider-error` : `divider-neutral`}">Last question</div>
	<div class="flex flex-col space-y-2 text-xl overflow-y-auto flex-grow">
        <div class="justify-center">
			<div class="">
				WordInKanji
			</div>
			<div class="">
				Word Readings
			</div>
			<div class="">
				Your answer: {previousAnswer}
			</div>
        </div>

        <div class="flex-none flex justify-center min-h-0">
			<div> Word description {currentAnswerStatus.substring(0, 0)} {currentAnswer.substring(0, 0)}</div>
        </div>
    </div>
</div>
