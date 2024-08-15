<script lang="ts">

	type Props = {
		fontName: string;
		fontSVG: string;
	};

	const
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		{
			fontName = ``,
			fontSVG = ``,
		}: Props = $props();

	let fontSvgUrl = $derived(URL.createObjectURL(new Blob([fontSVG || ``], { type: `image/svg+xml` })));
</script>

<div>
	<div class="flex flex-row p-4 border border-primary w-full text-center">
		<div class="w-1/2 flex align-middle justify-center">{fontName}</div>
		<div class="w-1/2">
			<div class="bg-base-content" style="
			mask-image: url({fontSvgUrl});
			mask-size: 100% 100%;">
				<img src={fontSvgUrl} alt="" class="opacity-0">
			</div>
		</div>
	</div>
</div>
