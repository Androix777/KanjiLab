<script lang="ts">
	import { getSettings } from "$lib/globalSettings.svelte";
    import FontsScreen from "./FontsScreen.svelte";
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
				oninput={(event) =>
				{
					if (event.target instanceof HTMLInputElement && event.target.value)
					{
						getSettings().minFrequency.set(parseInt(event.target.value));
					}
				}}
				value={getSettings().minFrequency.get()}
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
				oninput={(event) =>
				{
					if (event.target instanceof HTMLInputElement)
					{
						getSettings().maxFrequency.set(parseInt(event.target.value));
					}
				}}
				value={getSettings().maxFrequency.get()}
				class="input input-bordered w-1/2 text-center input-sm"
			/>
		</div>

		<div class="flex flex-row mt-4">
			<div class="flex-1 text-left my-auto">
				Word part
			</div>
			<input
				oninput={(event) =>
				{
					if (event.target instanceof HTMLInputElement)
					{
						getSettings().wordPart.set(event.target.value);
					}
				}}
				value={getSettings().wordPart.get()}
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
				oninput={(event) =>
				{
					if (event.target instanceof HTMLInputElement)
					{
						getSettings().roundDuration.set(parseInt(event.target.value));
					}
				}}
				value={getSettings().roundDuration.get()}
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
					oninput={(event) =>
					{
						if (event.target instanceof HTMLInputElement)
						{
							getSettings().roundsCount.set(parseInt(event.target.value));
						}
					}}
					value={getSettings().roundsCount.get()}
					class="input input-bordered w-1/2 text-center input-sm"
				/>
		</div>
		<div class="flex flex-row mt-4">
			<div class="flex-1 text-left my-auto">
				Selected fonts
			</div>
			<div class="flex flex-col w-1/2">
				<textarea class="textarea textarea-bordered resize-none" placeholder="No fonts selected">{getSettings().selectedFonts.get().join(` `)}</textarea>
			</div>
		</div>
		<div class="flex flex-row">
			<button
				class="btn btn-primary ml-auto -my-12"
				onclick={() => { fontsModal.showModal(); }}
				>Edit</button>
		</div>
		<dialog bind:this={fontsModal} class="h-screen w-screen rounded-md bg-black bg-opacity-50" style="min-height: 200vh; min-width: 200vw; margin-left: -50vw;">
			<form method="dialog">
				<button class="absolute top-0 left-0 hover:cursor-default" style="min-height: 200vh; min-width: 200vw; margin-left: -50vw;">✕</button>
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
