<script lang="ts">
	type Props = {
		items: string[];
		selectedIndex: number;
		onSelect: (selectedIndex: number, selectedItem: string | null) => void;
		disabled?: boolean;
		nullOptionEnabled?: boolean;
		maxOptions?: number;
	};

	const // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	{
		items,
		selectedIndex,
		onSelect,
		disabled = false,
		nullOptionEnabled = false,
		maxOptions = 4,
	}: Props = $props();

	let searchKeyword = $state(``);
	let inputElement: HTMLInputElement;

	function onItemClicked(itemIndexTuple: [number, string | null])
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

	let filterItems = $derived((items: string[]) =>
	{
		let filteredItemIndexTuples: Array<[number, string]> = new Array();
		filteredItemIndexTuples = getItemIndexTuples(items).filter(function(itemIndexTuple)
		{
			return itemIndexTuple[1].toLowerCase().includes(searchKeyword.toLowerCase());
		});
		filteredItemIndexTuples = filteredItemIndexTuples.sort((tuple1, tuple2) =>
		{
			if (tuple1[1].toLowerCase().indexOf(searchKeyword.toLowerCase()) > tuple2[1].toLowerCase().indexOf(searchKeyword.toLowerCase()))
			{
				return 1;
			}
			else if (tuple1[1].toLowerCase().indexOf(searchKeyword.toLowerCase()) < tuple2[1].toLowerCase().indexOf(searchKeyword.toLowerCase()))
			{
				return -1;
			}
			else
			{
				if (tuple1[1] > tuple2[1])
				{
					return 1;
				}
				else
				{
					return -1;
				}
			}
		});
		return filteredItemIndexTuples;
	});
</script>

<div class="dropdown w-full h-full">
	<button
		tabindex="0"
		class="select select-bordered w-full items-center"
		onclick={() =>
		{
			inputElement.focus();
		}}
		disabled={disabled}
	>
		{selectedIndex == -1 ? `(no option)` : items[selectedIndex]}
	</button>

	<div class="dropdown-content w-full">
		<input
			class="input input-bordered w-full"
			placeholder="Search..."
			bind:value={searchKeyword}
			bind:this={inputElement}
		/>

		<ul tabindex="-1" class="menu p-2 shadow bg-base-100 rounded-box max-h-80 flex-nowrap overflow-y-auto w-full">
			{#if nullOptionEnabled}
				<li>
					<button
						onclick={(event) =>
						{
							onItemClicked([-1, null]);
						}}
					>{`(no option)`}</button>
				</li>
			{/if}
			{#each filterItems(items).slice(0, maxOptions) as itemIndexTuple}
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
