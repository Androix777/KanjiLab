<script lang="ts">
	type Props = {
		answerStatus: string;
		previousWord: string;
		previousReadings: string[];
	};

	const
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		{
			answerStatus = ``,
			previousWord = ``,
			previousReadings = [``],
		}: Props = $props();
</script>

<div class="card w-3/4 bg-base-200 p-4">
    <div class="flex flex-col space-y-2 text-xl">
        <div class="flex justify-center">
            {#if answerStatus}
                {answerStatus}
            {:else}
                <div class="opacity-0">Placeholder</div>
            {/if}
        </div>

        <div class="flex justify-center">
            {#if previousWord}
                {previousWord} - {previousReadings.join(`   `)}
            {:else}
                <div class="opacity-0">Placeholder</div>
            {/if}
        </div>
    </div>
</div>
