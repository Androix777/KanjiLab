<script lang="ts">
	import { getSettings } from "$lib/globalSettings.svelte";
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
</script>

<div class="flex flex-col flex-grow h-full">
	<div class="overflow-y-auto">
		<div class="label">
			<span class="label-text">Min frequency</span>
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
			class="input input-bordered w-full"
			style="-webkit-appearance: none;"
		/>

		<div class="label">
			<span class="label-text">Max frequency</span>
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
			class="input input-bordered w-full"
		/>

		<div class="label">
			<span class="label-text">Word part</span>
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
			class="input input-bordered w-full"
		/>

		<div class="label">
			<span class="label-text">Round duration</span>
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
			class="input input-bordered w-full"
		/>
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
