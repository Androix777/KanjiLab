<script lang="ts">
    import SettingsScreen from "$lib/components/SettingsScreen.svelte";
    import StatsScreen from "$lib/components/StatsScreen.svelte";
	import StartGameScreen from "$lib/components/StartGameScreen.svelte";
	// import { FontLoader } from '$lib/fontLoader';
	import { themeChange } from 'theme-change';
    import SvgIcon from "$lib/components/SVGIcon.svelte";
    import DictionariesScreen from "$lib/components/DictionariesScreen.svelte";
    import FontsScreen from "$lib/components/FontsScreen.svelte";
    import { fly } from "svelte/transition";
    import { quintOut } from "svelte/easing";

	type ScreenType = `StartGame` | `Stats` | `Dictionaries` | `Fonts` | `Settings`;
	let currentScreenType: ScreenType = $state(`StartGame`);
	// let fontLoader: FontLoader = new FontLoader();

	function setScreen(screenType: ScreenType)
	{
		currentScreenType = screenType;
	}

	// async function loadFonts()
	// {
	// 	await fontLoader.initialize();
	// 	await fontLoader.loadFonts();
	// }

	$effect(() =>
	{
		themeChange(false);
		// void loadFonts();
	});
</script>

<div class="flex h-screen bg-base-300">
	<div class="w-16 min-h-full text-center bg-base-100 z-10">
		<ul class="">
			<button class="btn btn-square bg-base-100 border-0 p-1 mt-2 mb-4 shadow-none hover:bg-transparent hover:scale-125" onclick={() => { setScreen(`StartGame`); }}>
				<SvgIcon name="Quiz"/>
			</button>
			<button class="btn btn-square bg-base-100 border-0 p-1 mb-4 shadow-none hover:bg-transparent hover:scale-125" onclick={() => { setScreen(`Stats`); }}>
				<SvgIcon name="Bars"/>
			</button>
			<button class="btn btn-square bg-base-100 border-0 p-1 mb-4 shadow-none hover:bg-transparent hover:scale-125" onclick={() => { setScreen(`Dictionaries`); }}>
				<SvgIcon name="KanjiCards"/>
			</button>
			<button class="btn btn-square bg-base-100 border-0 p-1 mb-4 shadow-none hover:bg-transparent hover:scale-125" onclick={() => { setScreen(`Fonts`); }}>
				<SvgIcon name="Fonts"/>
			</button>
			<button class="btn btn-square bg-base-100 border-0 p-1 mb-4 shadow-none hover:bg-transparent hover:scale-125" onclick={() => { setScreen(`Settings`); }}>
				<SvgIcon name="Gears"/>
			</button>
		</ul>
	</div>
	{#key currentScreenType}
	<div class="absolute pl-16 w-full overflow-hidden">
		<div class="flex-1 bg-base-300 z-0" in:fly={{ duration: 300, x: `-100vw`, y: 0, opacity: 0.5, easing: quintOut }} out:fly={{ duration: 300, x: `100vw`, y: 0, opacity: 0.5, easing: quintOut }}>
			{#if currentScreenType === `StartGame`}
				<StartGameScreen />
			{:else if currentScreenType === `Stats`}
				<StatsScreen />
			{:else if currentScreenType === `Dictionaries`}
				<DictionariesScreen />
			{:else if currentScreenType === `Fonts`}
				<FontsScreen />
			{:else if currentScreenType === `Settings`}
				<SettingsScreen />
			{/if}
		</div>
	</div>
	{/key}
</div>
