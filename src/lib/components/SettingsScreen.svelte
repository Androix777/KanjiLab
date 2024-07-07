<script lang="ts">
	import ThemeSelect from "$lib/components/ThemeSelect.svelte";
	import { getSettings } from "$lib/globalSettings.svelte";
</script>

<div class="top-0 left-0 p-4">
	<ThemeSelect/>
	<input
		oninput={(event) =>
		{
			if (event.target instanceof HTMLInputElement)
			{
				getSettings().setUserName(event.target.value);
			}
		}}
		value={getSettings().userName}
		class="input input-bordered input-lg text-center w-3/4 text-3xl"
	/>
</div>
