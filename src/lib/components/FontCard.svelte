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
	<div class="flex flex-row p-2 w-full text-center card card-bordered border-primary">
		<div class="w-1/6 my-auto justify-center">
			<input type="checkbox" checked={true} class="checkbox" />
		</div>
		<div class="w-1/2 my-auto justify-center">{fontName}</div>
		<div class="w-1/3 m-auto flex justify-center">
			<div class="w-1/2">
				<div class="bg-base-content max-h-full max-w-full" style="
				mask-image: url({fontSvgUrl});
				mask-size: 100% 100%;">
					<img src={fontSvgUrl} alt="" class="opacity-0">
			</div>
			</div>
		</div>
	</div>
</div>
