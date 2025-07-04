<script lang="ts">
	import { getWordPartReadings, getWordParts } from "$lib/databaseTools";
	import { getWordsCount } from "$lib/databaseTools";
	import { getSettings } from "$lib/globalSettings.svelte";
	import WebSocketClient from "$lib/webSocketClient.svelte";
	import AutoComplete from "./AutoComplete.svelte";
	import FontsScreen from "./FontsScreen.svelte";

	let webSocketClient: WebSocketClient = $state(WebSocketClient.getInstance());

	let wordsCount: number = $state(0);
	let wordsLoading = $state(false);

	async function refreshWordsCount()
	{
		if (!isAdmin)
		{
			return;
		}
		wordsLoading = true;
		wordsCount = await getWordsCount();
		wordsLoading = false;
	}

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

	$effect(() =>
	{
		getSettings().minFrequency.get();
		getSettings().maxFrequency.get();
		getSettings().usingMaxFrequency.get();
		getSettings().wordPart.get();
		getSettings().wordPartReading.get();
		getSettings().selectedDictionaryId.get();

		void refreshWordsCount();
	});

	function countFonts()
	{
		let fontsCount = webSocketClient.isConnectedToSelf ? getSettings().selectedFonts.get().length : webSocketClient.onlineFontsCount;
		let firstFontName = webSocketClient.isConnectedToSelf ?
			webSocketClient.fontsInfo.filter((fontInfo) =>
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
		wordPartItems = await getWordParts(getSettings().selectedDictionaryId.get());
		if (getSettings().wordPart.get())
		{
			wordPartReadings = await getWordPartReadings(getSettings().wordPart.get(), getSettings().selectedDictionaryId.get());
		}
	}

	void refreshItems();
	void refreshWordsCount();
</script>

<div class="flex flex-col flex-grow h-full">
	<div class="h-full overflow-y-auto overflow-x-hidden relative">
		<div class="card-title">Game settings</div>
		<div class="flex flex-row mt-4 items-center">
			<div class="flex-1 text-left my-auto">
				Frequency
			</div>
			<div class="flex flex-row w-1/2 join">
				<input
					type="number"
					step="1"
					placeholder="Min"
					onchange={(event) =>
					{
						if (event.target instanceof HTMLInputElement && event.target.value)
						{
							getSettings().minFrequency.set(parseInt(event.target.value));
						}
					}}
					value={getSettings().minFrequency.get()}
					disabled={isSettingsLocked}
					class="input input-bordered text-center input-sm join-item min-w-0 w-[40%]"
				/>
				<input class="input input-bordered text-center input-sm join-item pointer-events-none w-[10%] min-w-8" disabled={isSettingsLocked} value="-" />
				<input
					type="text"
					placeholder="Max"
					onchange={(event) =>
					{
						if (event.target instanceof HTMLInputElement)
						{
							if (getSettings().usingMaxFrequency.get())
							{
								getSettings().maxFrequency.set(parseInt(event.target.value));
							}
						}
					}}
					value={getSettings().usingMaxFrequency.get() ? getSettings().maxFrequency.get() : "∞"}
					disabled={isSettingsLocked || !getSettings().usingMaxFrequency.get()}
					class="input input-bordered text-center input-sm join-item min-w-0 w-[40%]"
				/>
				<button
					class="btn btn-sm join-item w-[10%] min-w-8"
					class:btn-primary={getSettings().usingMaxFrequency.get()}
					class:btn-outline={!getSettings().usingMaxFrequency.get()}
					onclick={() =>
					{
						getSettings().usingMaxFrequency.set(!getSettings().usingMaxFrequency.get());
					}}
					disabled={isSettingsLocked}
				>
					∞
				</button>
			</div>
		</div>
		{#if !isAdmin}
			<div class="flex flex-row mt-4">
				<div class="flex-1 text-left my-auto">
					Word part
				</div>
				<div class="w-1/2 flex flex-row text-center gap-2">
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
				<div class="w-1/2 flex flex-row text-center gap-2">
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
					aria-label="modal-bg"
					class="absolute top-0 left-0 hover:cursor-default"
					style="min-height: 200vh; min-width: 200vw; margin-left: -50vw"
				></button>
			</form>
			<div class="h-full w-full flex justify-center items-center">
				<FontsScreen />
			</div>
		</dialog>
	</div>

	<div class="text-center flex-grow relative min-h-16 text-lg">
		<div class="absolute bottom-0 left-0 right-0">
			<button
				class="btn btn-primary w-full"
				onclick={startFunction}
				disabled={!isAdmin || wordsCount === 0 || wordsLoading}
			>
				{#if !isAdmin}
					Start
				{:else if wordsLoading}
					Counting…
				{:else if wordsCount === 0}
					No words
				{:else}
					Start ({wordsCount.toLocaleString()} words)
				{/if}
			</button>
		</div>
	</div>
</div>
