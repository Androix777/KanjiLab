<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
    import FontCard from "./FontCard.svelte";
    import { GET_SVG_TEXT, GET_ALL_FONTS_INFO } from "$lib/tauriFunctions";
    import { getSettings } from "$lib/globalSettings.svelte";
    import type { FontInfo } from "$lib/types";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";

	type FontRecord =
	{
		fontInfo: FontInfo;
		fontSVG: string;
	};

	let fontRecords: Array<FontRecord> = $state([]);
	let filteredFontList: Array<FontInfo> = $state([]);
	let controlsDisabled: boolean = $state(false);

	let pageSize: number = 4;
	let currentPage: number = $state(1);
	let savedPage: number = -1;
	let showOnlySelected: boolean = $state(false);
	let maxPages: number = $state(0);
	let searchKeyword: string = $state(``);

	onMount(() =>
	{
		void updateFontsPage();
	});

	async function updateFontsPage()
	{
		if (getSettings().fontsInfo.get().length == 0)
		{
			getSettings().fontsInfo.set(await invoke(GET_ALL_FONTS_INFO));
		}
		maxPages = Math.ceil(((showOnlySelected || searchKeyword != ``) ? filteredFontList : getSettings().fontsInfo.get()).length / pageSize);
		if (currentPage > maxPages) currentPage = maxPages;
		if (currentPage < 1) currentPage = 1;
		fontRecords = [];
		let fontPage = ((showOnlySelected || searchKeyword != ``) ? filteredFontList : getSettings().fontsInfo.get()).slice(pageSize * (currentPage - 1), pageSize * currentPage);
		for (let i = 0; i < fontPage.length; i++)
		{
			fontRecords.push({ fontInfo: fontPage[i], fontSVG: `` });
		}
		void loadSVGForFonts();
	}

	async function loadSVGForFonts()
	{
		for (let i = 0; i < fontRecords.length; i++)
		{
			try
			{
				fontRecords[i].fontSVG = await invoke(GET_SVG_TEXT, { text: `文字`, fontName: fontRecords[i].fontInfo.fontFile });
			}
			catch
			{
				console.log(`Failed to get SVG for font: ${fontRecords[i].fontInfo.fontFile}`);
			}
		}
	}

	function generateSelectedFonts()
	{
		return getSettings().fontsInfo.get().filter(fontInfo => getSettings().selectedFonts.get().includes(fontInfo.fontFile));
	}

	function generateFilteredFonts(keyword: string)
	{
		return getSettings().fontsInfo.get().filter(fontInfo => fontInfo.fontFile.toLocaleLowerCase().includes(keyword.toLocaleLowerCase()));
	}

	function filterFonts(selected: boolean, keyword: string)
	{
		filteredFontList = getSettings().fontsInfo.get().filter(fontInfo => fontInfo.fontFile.toLocaleLowerCase().includes(keyword.toLocaleLowerCase()));
		if (selected && keyword != ``)
		{
			filteredFontList = generateSelectedFonts().filter(font => generateFilteredFonts(keyword).includes(font));
		}
		else if (selected)
		{
			filteredFontList = generateSelectedFonts();
		}
		else if (keyword != ``)
		{
			filteredFontList = generateFilteredFonts(keyword);
		}
		else
		{
			filteredFontList = getSettings().fontsInfo.get();
		}
	}

</script>

<div class="p-4">
	<div class="flex flex-column justify-center items-center">
		<div class="card card-bordered bg-base-100 shadow-xl mb-4 p-4 flex-1" style="width: 50vw;">
			<div class="card-title mb-4">Fonts</div>
			<div class="flex flex-row mb-4">
				<div class="join flex-none">
					<button
						class="btn btn-primary join-item"
						onclick={() =>
						{
							let selectedFonts: Array<string> = [];
							getSettings().fontsInfo.get().forEach(fontInfo => selectedFonts.push(fontInfo.fontFile));
							getSettings().selectedFonts.set(selectedFonts);
							void updateFontsPage();
						}}>Select all</button>
					<button
						class="btn btn-primary join-item"
						onclick={() =>
						{
							getSettings().selectedFonts.set([]);
							void updateFontsPage();
						}}>Unselect all</button>
					<input
						class="input input-bordered"
						type="text"
						bind:value={searchKeyword}
						oninput={async () =>
						{
							controlsDisabled = true;

							if (searchKeyword != ``)
							{
								filterFonts(showOnlySelected, searchKeyword);
								if (savedPage == -1) savedPage = currentPage;
								currentPage = 1;
							}
							else if (savedPage != -1)
							{
								currentPage = savedPage;
								savedPage = -1;
							}

							await updateFontsPage();
							controlsDisabled = false;
						} } />
				</div>
				<div class="flex-grow"></div>
				<div class="flex flex-col justify-center flex-none">
					<div class="{showOnlySelected ? `text-primary` : ``}">Only selected</div>
					<div class="mx-auto">
					<input
						type="checkbox"
						class="toggle toggle-primary"
						onchange={async () =>
						{
							controlsDisabled = true;
							filterFonts(showOnlySelected, searchKeyword);
							if (showOnlySelected)
							{
								if (savedPage == -1) savedPage = currentPage;
								currentPage = 1;
							}
							if (!showOnlySelected && savedPage != -1)
							{
								currentPage = savedPage;
								savedPage = -1;
							}
							await updateFontsPage();
							controlsDisabled = false;
						}}
						bind:checked={showOnlySelected}
						disabled={controlsDisabled} />
				</div>
				</div>
			</div>
			<div class="join flex justify-center mb-4">
				<button class="join-item btn" onclick={ () =>
				{
					if (currentPage <= 1) return;
					currentPage--;
					void updateFontsPage();
				} }>🠈</button>
				<input type="text" class="join-item input w-10 p-0 text-center"
					style="background-color: oklch(var(--btn-color, var(--b2)) / var(--tw-bg-opacity)); line-height: 1em;"
					bind:value={currentPage}
					onchange={updateFontsPage}/>
				<button class="join-item btn">/</button>
				<button class="join-item btn">{maxPages}</button>
				<button class="join-item btn" onclick={ () =>
				{
					if (currentPage >= maxPages) return;
					currentPage++;
					void updateFontsPage();
				} }>🠊</button>
			</div>
			<div class="">
				{#each fontRecords as fontRecord(fontRecord.fontInfo.fontFile)}
					<div in:fade>
						<FontCard
							fontInfo = {fontRecord.fontInfo}
							fontSVG = {fontRecord.fontSVG || ``}
							onFontCheck = {(fontName: string, added: boolean) =>
							{
								if (added)
								{
									getSettings().selectedFonts.set([...getSettings().selectedFonts.get(), fontName]);
								}
								else
								{
									getSettings().selectedFonts.set(getSettings().selectedFonts.get().filter(e => e != fontName));
								}
							}}
							/>
						</div>
				{/each}
			</div>
		</div>
	</div>
</div>
