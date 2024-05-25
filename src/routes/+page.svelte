<script lang="ts">
    import GameScreen from "$lib/components/GameScreen.svelte";
    import SettingsScreen from "$lib/components/SettingsScreen.svelte";
	import { FontLoader } from '$lib/FontLoader';

	type ScreenType = `Game` | `Settings`;
	let currentScreenType: ScreenType = $state(`Settings`);
	let fontLoader: FontLoader = new FontLoader();

	function setScreen(screenType: ScreenType)
	{
		currentScreenType = screenType;
	}
	setScreen(`Settings`);

	async function loadFonts()
	{
		await fontLoader.initialize();
		await fontLoader.loadFonts();
	}

	$effect(() =>
	{
		void loadFonts();
	});
</script>

<div class="flex h-screen">
	<div class="w-16 min-h-full text-center bg-base-300">
		<ul class="">
			<button class="btn btn-primary" onclick={() => { setScreen(`Game`); }}>G</button>
			<button class="btn btn-primary" onclick={() => { setScreen(`Settings`); }}>S</button>
		</ul>
	</div>
	<div class="flex-1 bg-base-100">
		{#if currentScreenType === `Game`}
		<GameScreen />
		{:else if currentScreenType === `Settings`}
			<SettingsScreen />
		{/if}
	</div>
</div>
