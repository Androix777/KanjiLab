<script lang="ts">
	type Props = {
		items: string[];
		// selectedItem
		onSelect: (selectedItem: string) => void;
	};

	const // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	{
		items,
		onSelect,
	}: Props = $props();

	let searchKeyword = $state(``);
	let inputElement: HTMLInputElement;
	let selectedItem: string = $state(``);

	function onItemClicked(item: string)
	{
		if (document.activeElement && document.activeElement instanceof HTMLElement)
		{
			document.activeElement.blur();
		}
		onSelect(item);
		selectedItem = item;
		searchKeyword = ``;
	}

	let filteredItems = $derived(items.filter(function(item)
	{
		return item.toLowerCase().includes(searchKeyword.toLowerCase());
	}));
</script>

<div class="dropdown w-full">
	<button
		tabindex="0"
		class="select select-bordered w-full text-center items-center"
		onclick={() =>
		{
			inputElement.focus();
		}}
	>
		{selectedItem}
	</button>

	<div class="dropdown-content w-full">
		<input
			class="input input-bordered w-full"
			placeholder="Search..."
			bind:value={searchKeyword}
			bind:this={inputElement}
		/>

		<ul tabindex="-1" class="menu p-2 shadow bg-base-100 rounded-box max-h-80 flex-nowrap overflow-y-auto w-full">
			{#each filteredItems as item}
				<li>
					<button
						onclick={(event) =>
						{
							onItemClicked(item);
						}}
					>{item}</button>
				</li>
			{/each}
		</ul>
	</div>
</div>
