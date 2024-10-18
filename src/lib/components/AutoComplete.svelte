<script lang="ts">
	type Props = {
		items: string[];
		selectedIndex: number;
		onSelect: (selectedIndex: number, selectedItem: string) => void;
	};

	const // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	{
		items,
		selectedIndex,
		onSelect,
	}: Props = $props();

	let searchKeyword = $state(``);
	let inputElement: HTMLInputElement;

	function onItemClicked(itemIndexTuple: [number, string])
	{
		if (document.activeElement && document.activeElement instanceof HTMLElement)
		{
			document.activeElement.blur();
		}
		onSelect(...itemIndexTuple);
		searchKeyword = ``;
	}

	let getItemIndexTuples = $derived((items: string[]) =>
	{
		let itemIndexTuples: Array<[number, string]> = new Array();
		for (let i = 0; i < items.length; i++)
		{
			itemIndexTuples.push([i, items[i]]);
		}
		return itemIndexTuples;
	});

	let filteredItems = $derived(
		getItemIndexTuples(items).filter(function(itemIndexTuple)
		{
			return itemIndexTuple[1].toLowerCase().includes(searchKeyword.toLowerCase());
		}),
	);
</script>

<div class="dropdown w-full h-full">
	<button
		tabindex="0"
		class="select select-bordered w-full text-center items-center"
		onclick={() =>
		{
			inputElement.focus();
		}}
	>
		{selectedIndex == -1 ? `` : items[selectedIndex]}
	</button>

	<div class="dropdown-content w-full">
		<input
			class="input input-bordered w-full"
			placeholder="Search..."
			bind:value={searchKeyword}
			bind:this={inputElement}
		/>

		<ul tabindex="-1" class="menu p-2 shadow bg-base-100 rounded-box max-h-80 flex-nowrap overflow-y-auto w-full">
			{#each filteredItems.slice(0, 5) as itemIndexTuple}
				<li>
					<button
						onclick={(event) =>
						{
							onItemClicked(itemIndexTuple);
						}}
					>{itemIndexTuple[1]}</button>
				</li>
			{/each}
		</ul>
	</div>
</div>
