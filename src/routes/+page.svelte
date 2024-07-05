<script lang="ts">
    import GameScreen from "$lib/components/GameScreen.svelte";
    import SettingsScreen from "$lib/components/SettingsScreen.svelte";
    import StatsScreen from "$lib/components/StatsScreen.svelte";
	import { FontLoader } from '$lib/fontLoader';
	import { themeChange } from 'theme-change';
	import { LAUNCH_SERVER } from "$lib/tauriFunctions";
    import { invoke } from "@tauri-apps/api/core";

	async function launchServer()
	{
		await invoke(LAUNCH_SERVER);
	}

	type ScreenType = `Game` | `Settings` | `Stats`;
	let currentScreenType: ScreenType = $state(`Settings`);
	let fontLoader: FontLoader = new FontLoader();

	function setScreen(screenType: ScreenType)
	{
		currentScreenType = screenType;
	}
	setScreen(`Stats`);

	async function loadFonts()
	{
		await fontLoader.initialize();
		await fontLoader.loadFonts();
	}

	$effect(() =>
	{
		void launchServer();
		themeChange(false);
		void loadFonts();
	});
</script>

<div class="flex h-screen">
	<div class="w-16 min-h-full text-center bg-base-300">
		<ul class="">
			<button class="btn btn-primary" onclick={() => { setScreen(`Game`); }}>G</button>
			<button class="btn btn-primary" onclick={() => { setScreen(`Stats`); }}>St</button>
			<button class="btn btn-primary" onclick={() => { setScreen(`Settings`); }}>S</button>
		</ul>
	</div>
	<div class="flex-1 bg-base-100">
		{#if currentScreenType === `Stats`}
			<StatsScreen />
		{:else if currentScreenType === `Game`}
			<GameScreen fontLoader = {fontLoader} />
		{:else if currentScreenType === `Settings`}
			<SettingsScreen />
		{/if}
	</div>
</div>
