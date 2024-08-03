<script lang="ts">
    import LegacyGameScreen from "$lib/components/LegacyGameScreen.svelte";
    import SettingsScreen from "$lib/components/SettingsScreen.svelte";
    import StatsScreen from "$lib/components/StatsScreen.svelte";
	import StartGameScreen from "$lib/components/StartGameScreen.svelte";
	import { FontLoader } from '$lib/fontLoader';
	import { themeChange } from 'theme-change';

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
			<button class="btn btn-primary" onclick={() => { setScreen(`GameTest`); }}>Gl</button>
			<button class="btn btn-primary" onclick={() => { setScreen(`Stats`); }}>St</button>
			<button class="btn btn-primary" onclick={() => { setScreen(`Settings`); }}>S</button>
			<button class="btn btn-primary" onclick={() => { setScreen(`StartGame`); }}>G</button>
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
