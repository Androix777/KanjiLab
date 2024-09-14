<script lang="ts">
	import ThemeSelect from "$lib/components/ThemeSelect.svelte";
	import { getSettings } from "$lib/globalSettings.svelte";
	import AutoComplete from "./AutoComplete.svelte";

	let items: string[] = $state([
		`example item 1`,
		`example itme 2`,
	]);
</script>

<div class="p-4">
	<div class="flex flex-column justify-center items-center">
		<div class="card card-bordered bg-base-100 shadow-xl mb-4 p-4 min-w-96 max-w-screen-sm flex-1">
			<div class="card-title">Global settings</div>
			<div class="flex flex-row mt-4">
				<div class="flex-1 text-left my-auto">
					Player name
				</div>
				<input
					oninput={(event) =>
					{
						if (event.target instanceof HTMLInputElement)
						{
							getSettings().userName.set(event.target.value);
						}
					}}
					value={getSettings().userName.get()}
					class="flex-none input input-bordered text-center w-1/2"
				/>
			</div>
			<div class="flex flex-row mt-4">
				<div class="flex-1 text-left my-auto">
					Account
				</div>
				<div class="flex-none text-center w-1/2">
					<AutoComplete
						items={items}
						onSelect={(selectedItem: string) => console.log(selectedItem)}
					/>
				</div>
			</div>
			<div class="flex flex-row mt-4">
				<div class="flex-1 text-left my-auto">
					Visual theme
				</div>
				<div class="w-1/2">
					<ThemeSelect />
				</div>
			</div>
		</div>
	</div>
</div>
