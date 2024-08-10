<script lang="ts">
    import LegacyGameScreen from "$lib/components/LegacyGameScreen.svelte";
    import SettingsScreen from "$lib/components/SettingsScreen.svelte";
    import StatsScreen from "$lib/components/StatsScreen.svelte";
	import StartGameScreen from "$lib/components/StartGameScreen.svelte";
	import { FontLoader } from '$lib/fontLoader';
	import { themeChange } from 'theme-change';
    import SvgIcon from "$lib/components/SVGIcon.svelte";

	type ScreenType = `GameTest` | `Settings` | `Stats` | `StartGame`;
	let currentScreenType: ScreenType = $state(`StartGame`);
	let fontLoader: FontLoader = new FontLoader();

	function setScreen(screenType: ScreenType)
	{
		currentScreenType = screenType;
	}

	async function loadFonts()
	{
		await fontLoader.initialize();
		await fontLoader.loadFonts();
	}

	$effect(() =>
	{
		themeChange(false);
		void loadFonts();
	});
</script>

<div class="flex h-screen">
	<div class="w-16 min-h-full text-center bg-base-100">
		<ul class="">
			<button class="btn btn-square btn-primary p-1 my-2" onclick={() => { setScreen(`GameTest`); }}>
				<SvgIcon name="Nani"/>
			</button>
			<button class="btn btn-square btn-primary p-1 mb-2" onclick={() => { setScreen(`Stats`); }}>
				<SvgIcon name="Bars"/>
			</button>
			<button class="btn btn-square btn-primary p-1 mb-2" onclick={() => { setScreen(`Settings`); }}>
				<SvgIcon name="Gear"/>
			</button>
			<button class="btn btn-square btn-primary p-1 mb-2" onclick={() => { setScreen(`StartGame`); }}>
				<SvgIcon name="KanjiCards"/>
			</button>
		</ul>
	</div>
	<div class="flex-1 bg-base-300">
		{#if currentScreenType === `Stats`}
			<StatsScreen />
		{:else if currentScreenType === `GameTest`}
			<LegacyGameScreen fontLoader = {fontLoader} />
		{:else if currentScreenType === `Settings`}
			<SettingsScreen />
		{:else if currentScreenType === `StartGame`}
			<StartGameScreen />
		{/if}
	</div>
</div>
