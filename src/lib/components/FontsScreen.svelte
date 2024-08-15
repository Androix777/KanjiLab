<script lang="ts">
    import { getAllFonts } from "$lib/FontTools";
    import { onMount } from "svelte";
	import { invoke } from "@tauri-apps/api/core";
    import FontCard from "./FontCard.svelte";
    import { GET_SVG_TEXT } from "$lib/tauriFunctions";
    import { SvelteMap } from "svelte/reactivity";

	let fontSVGs: SvelteMap<string, string> = $state(new SvelteMap());
	let fontNames: string[] = $state([]);

	onMount(async () =>
	{
		fontNames = await getAllFonts();
		for (let i = 0; i < fontNames.length; i++)
		{
			fontSVGs.set(fontNames[i], await invoke(GET_SVG_TEXT, { text: `文字`, fontName: fontNames[i] }));
		}
	});

</script>

<div class="p-4">
	<div class="flex flex-column justify-center items-center">
		<div class="card card-bordered bg-base-100 shadow-xl mb-4 p-4 min-w-96 max-w-screen-sm flex-1">
			<div class="card-title">Fonts</div>
			{#each fontNames as fontName}
				<FontCard
					fontName = {fontName}
					fontSVG = {fontSVGs.get(fontName) || ``}
					/>
			{/each}
		</div>
	</div>
</div>
