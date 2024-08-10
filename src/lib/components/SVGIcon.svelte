<script lang="ts">
	import { convertFileSrc } from "@tauri-apps/api/core";
    import { resolveResource } from "@tauri-apps/api/path";

	type Props = {
		name: string;
	};

	const
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		{
			name = `KanjiCardsBlack`,
		}: Props = $props();

	async function getIcon(name: string)
	{
		let iconPath = resolveResource(`icons/${name}.svg`);
		const icon = convertFileSrc(await iconPath);
		return { icon: icon };
	}

</script>

<div class="flex h-full w-full items-center justify-center">
	{#await getIcon(name)}
		<span class="loading loading-ring loading-xs"></span>
	{:then { icon }}
		<img src={ icon } alt="icon" style="">
	{/await}
</div>
