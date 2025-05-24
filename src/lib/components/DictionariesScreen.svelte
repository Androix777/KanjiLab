<script lang="ts">
	import { deleteDictionary, getDictionaries, importDictionary } from "$lib/databaseTools";
    import type { DictionaryInfo } from "$lib/types";
	import { onMount } from "svelte";

	let dictionaries: Array<DictionaryInfo> = $state([]);
	let selectedDictionaryIndex: number = $state(-1);

	onMount(async () =>
	{
		dictionaries = await getDictionaries();
	});
</script>

<div class="p-4 h-full">
	<div class="card card-bordered bg-base-100 p-4 min-w-96 w-full h-full">
		<div class="card-title">Dictionaries</div>
		<div class="flex flex-row" style="height: 95%">
			<div class="flex-1 flex flex-col">
				<div class="flex-1 m-4 bg-base-300">
					<ul class="list">
						{#each dictionaries as dictionary, index}	
							<li class="list-row m-2 bg-base-100">
								<button 
									class="w-full h-full p-4 {selectedDictionaryIndex == index ? "border-info border-2" : ""}"
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
					<button class="btn btn-info btn-outline my-auto mx-4 flex-1">Select</button>
					<button 
						class="btn btn-error btn-outline my-auto mx-4 flex-1"
						onclick={async () =>
						{
							if (selectedDictionaryIndex < 0) return;
							await deleteDictionary(dictionaries[selectedDictionaryIndex].id);
							selectedDictionaryIndex = -1;
							dictionaries = await getDictionaries();
							console.log("Finished delete");
						}}
					>Delete</button>
					<button
						class="btn btn-success btn-outline my-auto mx-4 flex-1"
						onclick={async () =>
						{
							let path = "C:\\Users\\Airplane\\Documents\\Projects\\KanjiLab\\kanji_lab_loader\\data\\dict.db";
							await importDictionary(path);
							dictionaries = await getDictionaries();
							console.log("Finished import");
						}}
					>Import</button>
				</div>
			</div>
			<div class="flex-1 p-4">
				<div class="card-title">{selectedDictionaryIndex >= 0 && selectedDictionaryIndex in dictionaries ? dictionaries[selectedDictionaryIndex].name : "Nothing selected"}</div>
				<div class="text-pretty">{selectedDictionaryIndex} {dictionaries.length} {selectedDictionaryIndex >= 0 && selectedDictionaryIndex in dictionaries}</div>
			</div>
		</div>
	</div>
</div>
