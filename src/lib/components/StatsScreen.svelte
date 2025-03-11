<script lang="ts">
	import { getAllUsers, getAnswerStreaks } from "$lib/databaseTools";
	import type { User } from "$lib/types";
	import WebSocketClient from "$lib/webSocketClient.svelte";
	import { onMount } from "svelte";
	import AutoComplete from "./AutoComplete.svelte";
    import Heatmap from "./Heatmap.svelte";
	import type { HeatmapData } from "./Heatmap.svelte";

	const frequencyValuesX = [0, 1000, 2500, 5000, 7500, 10000, 15000, 20000, 30000, 50000, 100000];
	let heatmap : ReturnType<typeof Heatmap>;
	let data: HeatmapData = $state({axisValues: [], intersectionMatrix: []});
	let streaks: (number | null)[][] = $state([]);

	let users: User[];
	let selectedUser: User;
	let selectedUserIndex: number = $state(0);
	let usernames: string[] = $state([]);


	async function getStreaks()
	{
		streaks = [];
		for (const min of frequencyValuesX)
		{
			const row = [];
			for (const max of frequencyValuesX)
			{
				if (min >= max)
				{
					row.push(null);
				}
				else
				{
					const streak = await getAnswerStreaks(min, max, 1, selectedUser.key);
					row.push(streak.length > 0 ? streak[0].length : 0);
				}
			}
			streaks.push(row);
		}

		data = {
			axisValues: frequencyValuesX,
			intersectionMatrix: streaks.map(row => row.map(value => value === null ? 0 : value)),
		};

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		heatmap.redraw();
	}

	async function redraw()
	{
		await getStreaks();
	}

	onMount(async () =>
	{
		console.log("onMount")
		users = await getAllUsers();
		selectedUserIndex = users.findIndex(x => x.key == WebSocketClient.getInstance().accountKey) || 0;
		selectedUser = users[selectedUserIndex];

		usernames = users.map((user) =>
		{
			return user.username;
		});

		await redraw();
	});
</script>

<div>
	<AutoComplete
		items={usernames}
		selectedIndex={selectedUserIndex}
		maxOptions={10}
		onSelect={async (selectedIndex: number) =>
		{
			selectedUserIndex = selectedIndex;
			selectedUser = users[selectedUserIndex];
			await redraw();
		}}
	/>
	<Heatmap
		bind:this={heatmap}
		data={data}
		width={800}
		height={800}
		thresholds={[
			{ value: 0, color: "#gray" },
			{ value: 5, color: "#cd7f32" },
			{ value: 10, color: "#c0c0c0" },
			{ value: 50, color: "#ffd700" },
			{ value: 100, color: "#b9f2ff" },
		]}
	/>
</div>
