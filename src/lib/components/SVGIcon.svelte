<script lang="ts">

	type Props = {
		name: string;
	};

	const
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		{
			name,
		}: Props = $props();

	function getIcon(name: string)
	{
		const icon = `icons/${name}.svg`;
		return { icon: icon };
	}

</script>

<div class="flex h-full w-full items-center justify-center">
	{#await getIcon(name)}
		<span class="loading loading-ring loading-xs"></span>
	{:then { icon }}
		<div class="h-full w-full bg-primary" style="
			mask-image: url({icon});
			mask-size: 100% 100%;">
		</div>
	{/await}
</div>
