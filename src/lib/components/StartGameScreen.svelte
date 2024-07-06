<script lang="ts">
		import { LAUNCH_SERVER } from "$lib/tauriFunctions";
		import { invoke } from "@tauri-apps/api/core";

		async function launchServer()
		{
			await invoke(LAUNCH_SERVER);
		}

</script>

<div class="h-screen flex flex-col">

	<div class="flex-none">
		<div class="flex justify-between h-12">
			<div class="w-1/5 border text-center">
				<button class="btn btn-primary w-full h-full rounded-none" onclick={() => { void launchServer(); }}>Host Game</button>
			</div>
			<div class="w-1/5 border text-center">
				<button class="btn btn-primary w-full h-full rounded-none" onclick={() => {}}>Join Game</button>
			</div>
			<div class="w-3/5 border text-center">
				<input class="input input-bordered text-center w-full h-full"/>
			</div>
		</div>
	</div>

	<div class="flex-grow flex">
		<div class="w-3/5 border text-center">
			<div class="flex flex-col justify-center h-full">
				<span class="text-4xl">НАСТРОЙКИ</span>
			</div>
		</div>
		<div class="w-2/5 flex flex-col">
			<div class="flex-1 border text-center">Игроки</div>
			<div class="flex-1 border text-center flex flex-col">
				<div class="flex-grow flex flex-col">
					<div> test message</div>
					<div> test message</div>
				</div>
				<div class="flex justify-between h-12">
					<input class="input input-bordered text-center w-full"/>
					<button class="btn btn-primary w-12 rounded-none" onclick={() => {}}>Send</button>
				</div>
			</div>
		</div>
	</div>

	<div class="flex-none text-center h-12">
		<div class="border-x">
			<button class="btn btn-success w-full h-full rounded-none" onclick={() => {}}>START</button>
		</div>
	</div>

</div>
