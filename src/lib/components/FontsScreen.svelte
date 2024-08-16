<script lang="ts">
    import { getAllFonts } from "$lib/FontTools";
	import { invoke } from "@tauri-apps/api/core";
    import FontCard from "./FontCard.svelte";
    import { GET_SVG_TEXT } from "$lib/tauriFunctions";
    import { getSettings } from "$lib/globalSettings.svelte";

	type FontRecord =
	{
		fontName: string;
		fontSVG: string;
	};

	let pageSize: number = 10;
	let currentPage: number = $state(1);

	let fontRecords: Array<FontRecord> = $state([]);

	$effect(() =>
	{
		void getFontsPage(currentPage);
	});

	async function getFontsPage(pageNumber: number)
	{
		fontRecords = [];
		let fontNames = (await getAllFonts()).slice(pageSize * (pageNumber - 1), pageSize * pageNumber);
		for (let i = 0; i < fontNames.length; i++)
		{
			try
			{
				fontRecords.push({ fontName: fontNames[i], fontSVG: await invoke(GET_SVG_TEXT, { text: `文字`, fontName: fontNames[i] }) });
			}
			catch
			{
				console.log(`Failed to get SVG for font: ${fontNames[i]}`);
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
				} }>«</button>
				<button class="join-item btn">Page {currentPage}</button>
				<button class="join-item btn" onclick={ () =>
				{
					currentPage++;
				} }>»</button>
			</div>
			<div class="border-2 border-secondary">
				{#each fontRecords as fontRecord}
					<FontCard
						fontName = {fontRecord.fontName}
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
				{#each getSettings().selectedFonts.get() as fontName}
					{fontName}
				{/each}
			</div>
		</div>
	</div>
</div>
