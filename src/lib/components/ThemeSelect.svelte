<script lang="ts">
	import { themeChange } from "theme-change";
	$effect(() =>
	{
		themeChange(false);
	});
</script>

<div title="Change Theme" class="dropdown dropdown-end w-full">
	<div tabindex="0" role="button" class="btn outline-2 outline-transparent w-full py-2">
		<span class="flex-grow text-sm">Select theme</span>
		<span class="flex h-full shrink-0 flex-wrap gap-1">
			<span class="bg-primary rounded-badge w-2"></span>
			<span class="bg-secondary rounded-badge w-2"></span>
			<span class="bg-accent rounded-badge w-2"></span>
			<span class="bg-neutral rounded-badge w-2"></span>
		</span>
	</div>
	<div
		class="dropdown-content bg-base-200 text-base-content rounded-box top-px h-[28.6rem] max-h-[calc(100vh-10rem)] w-72 overflow-y-auto border border-white/5 shadow-2xl outline outline-1 outline-black/5 mt-14"
	>
		<div class="grid grid-cols-1 gap-3 p-3">
			{#each [
		"light",
		"dark",
		"cupcake",
		"bumblebee",
		"emerald",
		"corporate",
		"synthwave",
		"retro",
		"cyberpunk",
		"valentine",
		"halloween",
		"garden",
		"forest",
		"aqua",
		"lofi",
		"pastel",
		"fantasy",
		"wireframe",
		"black",
		"luxury",
		"dracula",
		"cmyk",
		"autumn",
		"business",
		"acid",
		"lemonade",
		"night",
		"coffee",
		"winter",
		"dim",
		"nord",
		"sunset",
	] as
				theme
			}
				<button
					class="outline-base-content text-start outline-offset-4"
					data-set-theme={theme}
					data-theme={theme}
				>
					<span class="bg-base-100 rounded-btn text-base-content block w-full cursor-pointer font-sans">
						<span class="grid grid-cols-5 grid-rows-3">
							<span class="col-span-5 row-span-3 row-start-1 flex items-center gap-2 px-4 py-3">
								<span class="flex-grow text-sm">{theme}</span>
								<span class="flex h-full shrink-0 flex-wrap gap-1">
									<span class="bg-primary rounded-badge w-2"></span>
									<span class="bg-secondary rounded-badge w-2"></span>
									<span class="bg-accent rounded-badge w-2"></span>
									<span class="bg-neutral rounded-badge w-2"></span>
								</span>
							</span>
						</span>
					</span>
				</button>
			{/each}
		</div>
	</div>
</div>
