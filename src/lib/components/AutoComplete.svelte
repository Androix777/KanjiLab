<script lang="ts">
	type Props = {
		items: string[];
		selectedIndex: number;
		onSelect: (selectedIndex: number, selectedItem: string | null) => void;
		disabled?: boolean;
		nullOptionEnabled?: boolean;
		maxOptions?: number;
		fitOptions?: number;
	};

	const {
		items,
		selectedIndex,
		onSelect,
		disabled = false,
		nullOptionEnabled = false,
		maxOptions = 100,
		fitOptions = 4,
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
		let itemIndexTuples: Array<[number, string]> = [];
		for (let i = 0; i < items.length; i++)
		{
			itemIndexTuples.push([i, items[i]]);
		}
		return itemIndexTuples;
	});

	let filterItems = $derived((items: string[]) =>
	{
		let filteredItemIndexTuples: Array<[number, string]> = [];
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

	<div class="dropdown-content w-full z-10">
		<input
			class="input input-bordered w-full h-10"
			placeholder="Search..."
			bind:value={searchKeyword}
			bind:this={inputElement}
			onkeydown={(event: KeyboardEvent) =>
			{
				let currentItems = filterItems(items);
				if (event.key == `Enter` && currentItems.length > 0)
				{
					onItemClicked(currentItems[0]);
				}
			}}
		/>

		<ul tabindex="-1" class="menu p-2 shadow bg-base-100 rounded-box flex-nowrap overflow-y-auto w-full" style="max-height: {fitOptions * 2.5 + 0.75}rem;">
			{#if nullOptionEnabled}
				<li>
					<button
						class="h-10"
						onclick={() =>
						{
							onItemClicked([-1, null]);
						}}
					>{`(no option)`}</button>
				</li>
			{/if}
			{#each filterItems(items).slice(0, maxOptions) as itemIndexTuple, index}
				<li>
					<button
						class="h-10 {index == 0 ? "bg-primary bg-opacity-10" : ""}"
						onclick={() =>
						{
							onItemClicked(itemIndexTuple);
						}}
					>{itemIndexTuple[1]}</button>
				</li>
			{/each}
		</ul>
	</div>
</div>
