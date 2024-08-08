<script lang="ts">
	import ThemeSelect from "$lib/components/ThemeSelect.svelte";
	import { getSettings } from "$lib/globalSettings.svelte";
    import PlayerListCard from "./PlayerListCard.svelte";
	import { SvelteMap } from "svelte/reactivity";
</script>

<div class="top-0 left-0 p-4 flex flex-row items-center">
	<div class="card card-bordered bg-base-100 shadow-xl mb-4 p-4 w-1/2">
		<div class="card-title">Settings</div>
		<div class="flex flex-row mt-4">
			<div class="flex-1 text-left my-auto">
				Visual theme
			</div>
			<ThemeSelect/>
		</div>
		<div class="flex flex-row mt-4">
			<div class="flex-1 text-left my-auto">
				Player name
			</div>
			<input
				oninput={(event) =>
				{
					if (event.target instanceof HTMLInputElement)
					{
						getSettings().userName.set(event.target.value);
					}
				}}
				value={getSettings().userName.get()}
				class="flex-none input input-bordered text-center w-52"
			/>
		</div>
	</div>
	<div class="w-1/2 flex flex-none justify-center">
		<div class="flex-none text-center card card-bordered bg-base-100 shadow-xl overflow-y-auto overflow-x-hidden p-4" style="width:30vw;">
			<div class="card-title mb-4">Player card example</div>
			<PlayerListCard
			clientInfo={{ id: `preview`, name: getSettings().userName.get(), is_admin: false }}
			isMe={true}
			gameHistory={[{ question: { question: ``, answers: [] }, answers: new SvelteMap([[`preview`, { answer: `せいかい`, answerStatus: `Correct` }]]) },
				{ question: { question: ``, answers: [] }, answers: new SvelteMap([[`preview`, { answer: `?`, answerStatus: `Unknown` }]]) }]}
			score={5}/>
		</div>
	</div>
</div>
