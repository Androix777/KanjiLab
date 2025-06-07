<script lang="ts">
	import { deleteDictionary, getDictionaries, importDictionary } from "$lib/databaseTools";
    import type { DictionaryInfo } from "$lib/types";
	import { onMount } from "svelte";
	import { open } from '@tauri-apps/plugin-dialog';
    import WebSocketClient from "$lib/webSocketClient.svelte";
    import { getSettings } from "$lib/globalSettings.svelte";

	let dictionaries: Array<DictionaryInfo> = $state([]);
	let selectedDictionaryIndex: number = $state(-1);
	let confirmedDictionaryIndex: number = $state(-1);
	const webSocketClient: WebSocketClient = WebSocketClient.getInstance();

	async function selectFile(): Promise<string | string[] | null>
	{
		const selected = await open({
			multiple: false,
			filters: 
			[
				{
					name: 'Database files',
					extensions: ['db']
				}
			]
		});
		return selected;
	}

	onMount(async () =>
	{
		dictionaries = await getDictionaries();
		confirmedDictionaryIndex = dictionaries.findIndex((dictionary: DictionaryInfo) => dictionary.id == getSettings().selectedDictionaryId.get());
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
					<button 
						class="btn btn-error btn-outline my-auto mx-4 flex-1"
						onclick={async () =>
						{
							if (selectedDictionaryIndex < 0) return;
							webSocketClient.isBusy = true;
							await deleteDictionary(dictionaries[selectedDictionaryIndex].id);
							selectedDictionaryIndex = -1;
							dictionaries = await getDictionaries();
							webSocketClient.isBusy = false;
						}}
					>Delete</button>
					<button
						class="btn btn-success btn-outline my-auto mx-4 flex-1"
						onclick={async () =>
						{
							let path: string | string[] | null = await selectFile();
							if (typeof (path) == `string`)
							{
								webSocketClient.isBusy = true;
								await importDictionary(path);
								dictionaries = await getDictionaries();
								webSocketClient.isBusy = false;
							}
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
