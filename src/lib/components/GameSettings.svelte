<script lang="ts">
	import { getSettings } from "$lib/globalSettings.svelte";
</script>

<div class="flex flex-col flex-grow justify-center h-full">
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
		class="input input-bordered input-lg text-center w-3/4 text-3xl"
	/>

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
		class="input input-bordered input-lg text-center w-3/4 text-3xl"
	/>

	<input
		oninput={(event) =>
		{
			if (event.target instanceof HTMLInputElement)
			{
				getSettings().wordPart.set(event.target.value);
			}
		}}
		value={getSettings().wordPart.get()}
		class="input input-bordered input-lg text-center w-3/4 text-3xl"
	/>

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
		class="input input-bordered input-lg text-center w-3/4 text-3xl"
	/>
</div>
