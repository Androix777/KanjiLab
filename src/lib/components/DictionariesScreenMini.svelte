<script lang="ts">
	import { getDictionaries } from "$lib/databaseTools";
    import type { DictionaryInfo } from "$lib/types";
	import { onMount } from "svelte";
    import { getSettings } from "$lib/globalSettings.svelte";

	let dictionaries: Array<DictionaryInfo> = $state([]);
	let selectedDictionaryIndex: number = $state(-1);
	let confirmedDictionaryIndex: number = $state(-1);

	async function loadDictionaries(): Promise<void>
	{
		const allDictionaries = await getDictionaries();
		dictionaries = allDictionaries.filter(dict => dict.isExist);
		confirmedDictionaryIndex = dictionaries.findIndex((dictionary: DictionaryInfo) => dictionary.id == getSettings().selectedDictionaryId.get());
	}

	onMount(async () =>
	{
		await loadDictionaries();
	});
</script>

<div class="p-4">
	<div class="card card-bordered bg-base-100 p-4 min-w-96 w-full h-full">
		<div class="card-title">Dictionaries</div>
		<div class="flex flex-row" style="height: 95%">
			<div class="flex-1 flex flex-col">
				<div class="flex-1 m-4 bg-base-300">
					<ul class="list">
						{#each dictionaries as dictionary, index}	
							<li class="list-row m-2 bg-base-100">
								<button 
									class="w-full h-full p-4 border-2 {selectedDictionaryIndex == index ? "border-info" : "border-transparent"} {confirmedDictionaryIndex == index ? "bg-success bg-opacity-20" : ""}"
									onclick={()=>
									{
										selectedDictionaryIndex = index;
									}}
								>
									<div>{index}. {dictionary.name}</div>
								</button>
							</li>
						{/each}
					</ul>
				</div>
				<div class="flex-none h-16 flex flex-row justify-center">
					<button
						class="btn btn-info btn-outline my-auto mx-4 flex-1"
						onclick={() =>
						{
							getSettings().selectedDictionaryId.set(dictionaries[selectedDictionaryIndex].id);
							confirmedDictionaryIndex = dictionaries.findIndex((dictionary: DictionaryInfo) => dictionary.id == getSettings().selectedDictionaryId.get());
						}}
					>Select</button>
				</div>
			</div>
		</div>
	</div>
</div>
