<script lang="ts">
	type Props = {
		iconName: string;
		disabled: boolean;
	};

	const {
		iconName,
		disabled,
	}: Props = $props();

	function getIcon(name: string)
	{
		const icon = `icons/${name}.svg`;
		return { icon: icon };
	}
</script>

<div class="flex h-full w-full items-center justify-center">
	{#await getIcon(iconName)}
		<span class="loading loading-ring loading-xs"></span>
	{:then { icon }}
		<div class="h-full w-full {disabled ? `bg-base-content` : `bg-primary`}" style="mask-image: url({icon}); mask-size: 100% 100%"></div>
	{/await}
</div>
