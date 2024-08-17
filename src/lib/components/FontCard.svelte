<script lang="ts">
    import { getSettings } from "$lib/globalSettings.svelte";
    import type { FontInfo } from "$lib/types";

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

	function selectFont()
	{
		onFontCheck(fontInfo.font_file, fontSelected);
	}

	let fontSelected: boolean = $state(getSettings().selectedFonts.get().includes(fontInfo.font_file));
</script>

<div>
	<div class="flex flex-row p-2 w-full text-center card card-bordered border-primary">
		<div class="w-1/6 my-auto justify-center">
			<input type="checkbox"
				class="checkbox"
				onchange={selectFont}
				bind:checked={fontSelected} />
		</div>
		<div class="w-1/2 my-auto justify-center">
			<div>File: {fontInfo.font_file}</div>
			<div>Full name: {fontInfo.full_name}</div>
			<div>Number of glyphs: {fontInfo.num_glyphs}</div>
		</div>
		<div class="w-1/3 m-auto flex justify-center">
			<div class="w-1/2">
				<div class="bg-base-content max-h-full max-w-full" style="
				mask-image: url({fontSvgUrl});
				mask-size: 100% 100%;">
					<img src={fontSvgUrl} alt="" class="opacity-0">
			</div>
			</div>
		</div>
	</div>
</div>
