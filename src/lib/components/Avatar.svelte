<script lang="ts">
	import { getSettings } from "$lib/globalSettings.svelte";
	import blockies from "blockies";
	import jdenticon from "jdenticon/standalone";

	type Props = {
		key: string;
	};

	const {
		key,
	}: Props = $props();

	let blockieContainer: HTMLElement | null = $state(null);

	$effect(() =>
	{
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (blockieContainer != null)
		{
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			blockieContainer.replaceChildren(blockies({ seed: key, size: 9, scale: 100 }));
		}
	});
</script>

<div class="w-16 h-16">
	{#if getSettings().avatars.get() == 0}
		<div class="p-1">
			<div class="w-14 h-14 [&>*:only-child]:w-full [&>*:only-child]:h-full">
				{@html jdenticon.toSvg(key, 80)}
			</div>
		</div>
	{:else if getSettings().avatars.get() == 1}
		<div class="p-2">
			<div
				class="w-12 h-12 rounded-lg overflow-hidden [&>*:only-child]:w-full [&>*:only-child]:h-full"
				bind:this={blockieContainer}
			>
			</div>
		</div>
	{/if}
</div>
