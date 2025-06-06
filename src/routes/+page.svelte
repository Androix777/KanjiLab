<script lang="ts">
	import DictionariesScreen from "$lib/components/DictionariesScreen.svelte";
	import FontsScreen from "$lib/components/FontsScreen.svelte";
	import SettingsScreen from "$lib/components/SettingsScreen.svelte";
	import StartGameScreen from "$lib/components/StartGameScreen.svelte";
	import StatsScreen from "$lib/components/StatsScreen.svelte";
	import SvgIcon from "$lib/components/SVGIcon.svelte";
	import { getSettings } from "$lib/globalSettings.svelte";
	import { createAccount, getAccounts } from "$lib/networkTools";
	import WebSocketClient from "$lib/webSocketClient.svelte";
	import { onMount } from "svelte";
	import { quintOut } from "svelte/easing";
	import { fly } from "svelte/transition";
	import { themeChange } from "theme-change";

	type ScreenType = `StartGame` | `Stats` | `Dictionaries` | `Fonts` | `Settings`;
	let currentScreenType: ScreenType = $state(`StartGame`);
	const client = WebSocketClient.getInstance();

	function setScreen(screenType: ScreenType)
	{
		currentScreenType = screenType;
	}

	async function initApp()
	{
		let accounts = await getAccounts();
		if (accounts.length == 0)
		{
			await createAccount(`New account`);
			accounts = await getAccounts();
		}

		client.accountKey = accounts[getSettings().currentAccount.get()].publicKey;
		client.accountName = accounts[getSettings().currentAccount.get()].name;
	}

	$effect(() =>
	{
		themeChange(false);
	});

	onMount(() =>
	{
		void initApp();
	});
</script>

{#if client.isBusy}
  <div class="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
    <span class="loading loading-bars loading-xl"></span>
  </div>
{/if}
<div class="flex h-screen bg-base-300">
	<div class="w-16 min-h-full text-center bg-base-100 z-10">
		<ul class="">
			<button
				class="btn btn-square bg-base-100 border-0 p-1 mt-2 mb-4 shadow-none hover:bg-transparent hover:scale-125 disabled:bg-transparent"
				onclick={() =>
				{
					setScreen(`StartGame`);
				}}
				disabled={false}
			>
				<SvgIcon
					iconName="Quiz"
					disabled={false}
				/>
			</button>
			<button
				class="btn btn-square bg-base-100 border-0 p-1 mb-4 shadow-none hover:bg-transparent hover:scale-125 disabled:bg-transparent"
				onclick={() =>
				{
					setScreen(`Stats`);
				}}
				disabled={WebSocketClient.getInstance().gameStatus != `Off`}
			>
				<SvgIcon
					iconName="Bars"
					disabled={WebSocketClient.getInstance().gameStatus != `Off`}
				/>
			</button>
			<button
				class="btn btn-square bg-base-100 border-0 p-1 mb-4 shadow-none hover:bg-transparent hover:scale-125 disabled:bg-transparent"
				onclick={() =>
				{
					setScreen(`Dictionaries`);
				}}
				disabled={WebSocketClient.getInstance().gameStatus != `Off`}
			>
				<SvgIcon
					iconName="KanjiCards"
					disabled={WebSocketClient.getInstance().gameStatus != `Off`}
				/>
			</button>
			<button
				class="btn btn-square bg-base-100 border-0 p-1 mb-4 shadow-none hover:bg-transparent hover:scale-125 disabled:bg-transparent"
				onclick={() =>
				{
					setScreen(`Settings`);
				}}
				disabled={WebSocketClient.getInstance().gameStatus != `Off`}
			>
				<SvgIcon
					iconName="Gears"
					disabled={WebSocketClient.getInstance().gameStatus != `Off`}
				/>
			</button>
		</ul>
	</div>
	{#key currentScreenType}
		<div class="absolute pl-16 w-full h-full overflow-hidden">
			<div
				class="h-full bg-base-300 z-0"
				in:fly={{ duration: 300, x: `-100vw`, y: 0, opacity: 0.5, easing: quintOut }}
				out:fly={{ duration: 300, x: `100vw`, y: 0, opacity: 0.5, easing: quintOut }}
			>
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
