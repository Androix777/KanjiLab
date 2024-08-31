<script lang="ts">
    import { getSettings } from "$lib/globalSettings.svelte";
    import type { FontInfo } from "$lib/types";
    import { fade } from "svelte/transition";

	type Props = {
		fontInfo: FontInfo;
		fontSVG: string;
		onFontCheck: (fontName: string, added: boolean) => void;
	};

	const
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		{
			fontInfo,
			fontSVG,
			onFontCheck,
		}: Props = $props();

	let fontSvgUrl = $derived(URL.createObjectURL(new Blob([fontSVG || ``], { type: `image/svg+xml` })));

	function selectFont(added: boolean)
	{
		onFontCheck(fontInfo.fontFile, added);
	}

	let fontSelected: boolean = $derived(getSettings().selectedFonts.get().includes(fontInfo.fontFile));
</script>

<div>
	<div class="flex flex-row p-2 w-full text-center card card-bordered border-primary bg-base-200 mb-2 h-24 overflow-hidden">
		<div class="w-1/6 my-auto justify-center">
			<input type="checkbox"
				class="checkbox"
				onchange={(event: Event) =>
				{
					if (event.target instanceof HTMLInputElement)
					{
						selectFont(event.target.checked);
					}
				}}
				checked={fontSelected} />
		</div>
		<div class="w-1/2 my-auto justify-center overflow-hidden">
			<div class="text-ellipsis inline-block overflow-hidden whitespace-nowrap -mb-1" style="width: calc(100%);">File: {fontInfo.fontFile}</div>
			<div class="text-ellipsis inline-block overflow-hidden whitespace-nowrap -mb-1" style="width: calc(100%);">Full name: {fontInfo.fullName}</div>
			<div class="text-ellipsis inline-block overflow-hidden whitespace-nowrap -mb-1" style="width: calc(100%);">Number of glyphs: {fontInfo.numGlyphs}</div>
		</div>
		{#if fontSVG != ``}
		<div class="m-auto flex-none justify-center" transition:fade>
			<div class="h-24">
				<div class="bg-base-content max-h-full" style="
					mask-image: url({fontSvgUrl});
					mask-size: 100% 100%;">
					<img src={fontSvgUrl} alt="" class="opacity-0 object-contain h-20">
				</div>
			</div>
		</div>
		{/if}
	</div>
</div>
