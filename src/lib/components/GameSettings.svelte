<script lang="ts">
	import { getSettings } from "$lib/globalSettings.svelte";
    import FontsScreen from "./FontsScreen.svelte";
	import WebSocketClient from "$lib/webSocketClient.svelte";

	let webSocketClient: WebSocketClient = $state(WebSocketClient.getInstance());

	type Props = {
		startFunction: () => void;
		isAdmin: boolean;
	};

	const
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		{
			startFunction = () => {},
			isAdmin = false,
		}: Props = $props();

	let fontsModal: HTMLDialogElement;

	$effect(() =>
	{
		getSettings().minFrequency.get();
		getSettings().maxFrequency.get();
		getSettings().wordPart.get();
		getSettings().roundDuration.get();
		getSettings().roundsCount.get();
		getSettings().selectedFonts.get();

		if (!webSocketClient.isConnectedToSelf) return;

		void webSocketClient.sendNewSettings();
	});

	function countFonts()
	{
		let fontsCount = webSocketClient.isConnectedToSelf ? getSettings().selectedFonts.get().length : webSocketClient.onlineFontsCount;
		let firstFontName = webSocketClient.isConnectedToSelf ? getSettings().selectedFonts.get().at(0) : webSocketClient.onlineFirstFontName;
		if (fontsCount && fontsCount > 1)
		{
			return `${firstFontName} and ${fontsCount - 1} more fonts selected`;
		}
		else if (fontsCount == 1)
		{
			return `${firstFontName} selected`;
		}
		else
		{
			return `No fonts selected`;
		}
	}

	let isSettingsLocked = $derived(!webSocketClient.isConnectedToSelf || webSocketClient.gameStatus == `Off` || webSocketClient.gameStatus == `Connecting`);
</script>

<div class="flex flex-col flex-grow h-full">
	<div class="overflow-y-auto relative">
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
				style="-webkit-appearance: none;"
			/>
		</div>

		<div class="flex flex-row mt-4">
			<div class="flex-1 text-left my-auto">
				Max frequency
			</div>
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

		<div class="flex flex-row mt-4">
			<div class="flex-1 text-left my-auto">
				Word part
			</div>
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
		</div>

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
					value={countFonts()}>
				<button
					class="btn btn-primary btn-sm join-item"
					onclick={() => { fontsModal.showModal(); }}
					disabled={isSettingsLocked}
					>Edit</button>
			</div>
		</div>
		<dialog
			bind:this={fontsModal}
			class="h-screen w-screen rounded-md bg-black bg-opacity-50" style="min-height: 200vh; min-width: 200vw; margin-left: -50vw;">
			<form method="dialog">
				<button
					class="absolute top-0 left-0 hover:cursor-default"
					style="min-height: 200vh; min-width: 200vw; margin-left: -50vw;"
					>✕</button>
			</form>
			<div class="h-full w-full flex justify-center items-center">
				<FontsScreen />
			</div>
		</dialog>
	</div>

	<div class="text-center flex-grow relative min-h-16">
		<div class="absolute bottom-0 left-0 right-0">
			<button class="btn btn-primary w-full"
				onclick={startFunction}
				disabled={!isAdmin}>
				Start
			</button>
		</div>
	</div>
</div>
