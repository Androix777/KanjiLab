<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
    import FontCard from "./FontCard.svelte";
    import { GET_SVG_TEXT, GET_ALL_FONTS_INFO } from "$lib/tauriFunctions";
    import { getSettings } from "$lib/globalSettings.svelte";
    import type { FontInfo } from "$lib/types";
    import { onMount } from "svelte";

	type FontRecord =
	{
		fontInfo: FontInfo;
		fontSVG: string;
	};

	let pageSize: number = 10;
	let currentPage: number = $state(1);

	let fontRecords: Array<FontRecord> = $state([]);
	let fontList: Array<FontInfo> = [];

	let showOnlySelected: boolean = $state(false);

	onMount(() =>
	{
		void updateFontsPage();
	});

	async function updateFontsPage()
	{
		if (fontList.length == 0)
		{
			fontList = await invoke(GET_ALL_FONTS_INFO);
		}
		fontRecords = [];
		let fontPage = (showOnlySelected ? fontList.filter(fontInfo => getSettings().selectedFonts.get().includes(fontInfo.font_file)) : fontList).slice(pageSize * (currentPage - 1), pageSize * currentPage);
		for (let i = 0; i < fontPage.length; i++)
		{
			try
			{
				fontRecords.push({ fontInfo: fontPage[i], fontSVG: await invoke(GET_SVG_TEXT, { text: `読書`, fontName: fontPage[i].font_file }) });
			}
			catch
			{
				fontRecords.push({ fontInfo: fontPage[i], fontSVG: `` });
				console.log(`Failed to get SVG for font: ${fontPage[i].full_name}`);
			}
		}
	}

</script>

<div class="p-4">
	<div class="flex flex-column justify-center items-center">
		<div class="card card-bordered bg-base-100 shadow-xl mb-4 p-4 min-w-96 max-w-screen-sm flex-1">
			<div class="card-title">Fonts</div>
			<div class="join flex justify-center">
				<button class="join-item btn" onclick={ () =>
				{
					currentPage--;
					void updateFontsPage();
				} }>«</button>
				<button class="join-item btn">Page {currentPage}</button>
				<button class="join-item btn" onclick={ () =>
				{
					currentPage++;
					void updateFontsPage();
				} }>»</button>
				<input type="checkbox"
					class="checkbox"
					onchange={() => updateFontsPage()}
					bind:checked={showOnlySelected} />
			</div>
			<div class="border-2 border-secondary">
				{#each fontRecords as fontRecord}
					<FontCard
						fontInfo = {fontRecord.fontInfo}
						fontSVG = {fontRecord.fontSVG || ``}
						onFontCheck = {(fontName: string, added: boolean) =>
						{
							if (added)
							{
								getSettings().selectedFonts.get().push(fontName);
							}
							else
							{
								getSettings().selectedFonts.set(getSettings().selectedFonts.get().filter(e => e != fontName));
							}
						}}
						/>
				{/each}
			</div>
		</div>
	</div>
</div>
