<script lang="ts">
	import { getWordPartReadings, getWordParts } from "$lib/databaseTools";
	import { getSettings } from "$lib/globalSettings.svelte";
	import WebSocketClient from "$lib/webSocketClient.svelte";
	import AutoComplete from "./AutoComplete.svelte";
	import FontsScreen from "./FontsScreen.svelte";

	let webSocketClient: WebSocketClient = $state(WebSocketClient.getInstance());

	type Props = {
		startFunction: () => void;
		isAdmin: boolean;
	};

	const {
		startFunction,
		isAdmin,
	}: Props = $props();

	let fontsModal: HTMLDialogElement;

	$effect(() =>
	{
		getSettings().minFrequency.get();
		getSettings().maxFrequency.get();
		getSettings().usingMaxFrequency.get();
		getSettings().wordPart.get();
		getSettings().wordPartReading.get();
		getSettings().roundDuration.get();
		getSettings().roundsCount.get();
		getSettings().selectedFonts.get();

		if (!webSocketClient.isConnectedToSelf) return;

		void webSocketClient.sendNewSettings();
	});

	function countFonts()
	{
		let fontsCount = webSocketClient.isConnectedToSelf ? getSettings().selectedFonts.get().length : webSocketClient.onlineFontsCount;
		let firstFontName = webSocketClient.isConnectedToSelf ?
			getSettings().fontsInfo.get().filter((fontInfo) =>
			{
				return fontInfo.fontFile == getSettings().selectedFonts.get().at(0);
			}).at(0)?.fullName :
			webSocketClient.onlineFirstFontName;
		if (fontsCount && fontsCount > 1)
		{
			return `"${firstFontName}" and ${fontsCount - 1} more fonts selected`;
		}
		else if (fontsCount == 1)
		{
			return `"${firstFontName}" selected`;
		}
		else
		{
			return `No fonts selected`;
		}
	}

	let isSettingsLocked = $derived(!webSocketClient.isConnectedToSelf || webSocketClient.gameStatus == `Off` || webSocketClient.gameStatus == `Connecting`);

	let wordPartItems: string[] = $state([]);
	let wordPartReadings: string[] = $state([]);

	$effect(() =>
	{
		getSettings().wordPart.get();
		void refreshItems();
	});

	async function refreshItems()
	{
		wordPartItems = await getWordParts();
		if (getSettings().wordPart.get())
		{
			wordPartReadings = await getWordPartReadings(getSettings().wordPart.get());
		}
	}

	void refreshItems();
</script>

<div class="flex flex-col flex-grow h-full">
	<div class="h-full overflow-y-auto overflow-x-hidden relative">
		<div class="card-title">Game settings</div>
		<div class="flex flex-row mt-4">
			<div class="flex-1 text-left my-auto">
				Min frequency
			</div>
			<input
				type="number"
				step="1"
				onchange={(event) =>
				{
					if (event.target instanceof HTMLInputElement && event.target.value)
					{
						getSettings().minFrequency.set(parseInt(event.target.value));
					}
				}}
				value={getSettings().minFrequency.get()}
				disabled={isSettingsLocked}
				class="input input-bordered w-1/2 text-center input-sm"
				style="-webkit-appearance: none"
			/>
		</div>

		<div class="flex flex-row mt-4 items-center">
			<div class="flex-1 text-left my-auto">
				Max frequency
			</div>
			<input
				type="checkbox"
				class="checkbox checkbox-primary flex-none m-2"
				checked={getSettings().usingMaxFrequency.get()}
				disabled={isSettingsLocked}
				onchange={(event) =>
				{
					if (event.target instanceof HTMLInputElement)
					{
						getSettings().usingMaxFrequency.set(event.target.checked);
					}
				}}
			/>
			<input
				type="number"
				step="1"
				onchange={(event) =>
				{
					if (event.target instanceof HTMLInputElement)
					{
						getSettings().maxFrequency.set(parseInt(event.target.value));
					}
				}}
				value={getSettings().maxFrequency.get()}
				disabled={isSettingsLocked}
				class="input input-bordered w-1/2 text-center input-sm"
			/>
		</div>
		{#if !isAdmin}
			<div class="flex flex-row mt-4">
				<div class="flex-1 text-left my-auto">
					Word part
				</div>
				<div class="w-1/2 flex flex-row text-center">
					<input
						onchange={(event) =>
						{
							if (event.target instanceof HTMLInputElement)
							{
								getSettings().wordPart.set(event.target.value);
							}
						}}
						value={getSettings().wordPart.get()}
						disabled={isSettingsLocked}
						class="input input-bordered w-1/2 text-center input-sm"
					/>
					<input
						onchange={(event) =>
						{
							if (event.target instanceof HTMLInputElement)
							{
								getSettings().wordPartReading.set(event.target.value);
							}
						}}
						value={getSettings().wordPartReading.get()}
						disabled={isSettingsLocked}
						class="input input-bordered w-1/2 text-center input-sm"
					/>
				</div>
			</div>
		{:else}
			<div class="flex flex-row mt-4">
				<div class="flex-1 text-left my-auto">
					Word part
				</div>
				<div class="w-1/2 flex flex-row text-center">
					<div class="w-1/2 h-8 [&>*:nth-child(1)>:nth-child(1)]:select-sm">
						<AutoComplete
							items={wordPartItems}
							selectedIndex={wordPartItems.indexOf(getSettings().wordPart.get())}
							onSelect={(selectedIndex, selectedItem: string | null) =>
							{
								void refreshItems();
								getSettings().wordPart.set(selectedItem != null ? selectedItem : ``);
							}}
							disabled={isSettingsLocked}
							nullOptionEnabled={true}
						/>
					</div>
					<div class="w-1/2">
						<select
							class="select select-bordered w-full select-sm"
							value={getSettings().wordPartReading.get()}
							onchange={(event) =>
							{
								if (event.target instanceof HTMLSelectElement)
								{
									getSettings().wordPartReading.set(event.target.value);
								}
							}}
							disabled={isSettingsLocked}
						>
							<option value={``}>(no option)</option>
							{#each wordPartReadings as readingOption}
								<option value={readingOption}>{readingOption}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		{/if}
		<div class="flex flex-row mt-4">
			<div class="flex-1 text-left my-auto">
				Round duration
			</div>
			<input
				type="number"
				step="1"
				onchange={(event) =>
				{
					if (event.target instanceof HTMLInputElement)
					{
						getSettings().roundDuration.set(parseInt(event.target.value));
					}
				}}
				value={getSettings().roundDuration.get()}
				disabled={isSettingsLocked}
				class="input input-bordered w-1/2 text-center input-sm"
			/>
		</div>

		<div class="flex flex-row mt-4">
			<div class="flex-1 text-left my-auto">
				Rounds count
			</div>
			<input
				type="number"
				step="1"
				onchange={(event) =>
				{
					if (event.target instanceof HTMLInputElement)
					{
						getSettings().roundsCount.set(parseInt(event.target.value));
					}
				}}
				value={getSettings().roundsCount.get()}
				disabled={isSettingsLocked}
				class="input input-bordered w-1/2 text-center input-sm"
			/>
		</div>
		<div class="flex flex-row mt-4">
			<div class="flex-1 text-left my-auto">
				Selected fonts
			</div>
			<div class="flex flex-row w-1/2 join">
				<input
					disabled={true}
					class="input input-bordered input-disabled input-sm flex-grow text-center join-item"
					value={countFonts()}
				>
				<button
					class="btn btn-primary btn-sm join-item"
					onclick={() =>
					{
						fontsModal.showModal();
					}}
					disabled={isSettingsLocked}
				>Edit</button>
			</div>
		</div>
		<dialog
			bind:this={fontsModal}
			class="h-screen w-screen rounded-md bg-black bg-opacity-50"
			style="min-height: 200vh; min-width: 200vw; margin-left: -50vw"
		>
			<form method="dialog">
				<button
					class="absolute top-0 left-0 hover:cursor-default"
					style="min-height: 200vh; min-width: 200vw; margin-left: -50vw"
				>✕</button>
			</form>
			<div class="h-full w-full flex justify-center items-center">
				<FontsScreen />
			</div>
		</dialog>
	</div>

	<div class="text-center flex-grow relative min-h-16">
		<div class="absolute bottom-0 left-0 right-0">
			<button
				class="btn btn-primary w-full"
				onclick={startFunction}
				disabled={!isAdmin}
			>
				Start
			</button>
		</div>
	</div>
</div>
