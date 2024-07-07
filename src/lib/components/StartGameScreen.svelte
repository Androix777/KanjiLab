<script lang="ts">
	import { LAUNCH_SERVER, STOP_SERVER } from "$lib/tauriFunctions";
	import { invoke } from "@tauri-apps/api/core";
	import { getSettings } from "$lib/globalSettings.svelte";
	import WebSocketClient from "$lib/webSocketClient.svelte";
    import { onMount } from "svelte";

	let ipAddress: string = $state(`ws://127.0.0.1:8080`);
	let webSocketClient: WebSocketClient | null = $state(null);

	async function launchServer()
	{
		getSettings().setIsConnectedToSelf(true);
		await invoke(LAUNCH_SERVER);
		webSocketClient = WebSocketClient.getInstance();
		webSocketClient.connect(`ws://127.0.0.1:8080`);
	}

	async function stopServer()
	{
		getSettings().setIsConnectedToSelf(false);
		leaveServer();
		await invoke(STOP_SERVER);
	}

	function joinServer()
	{
		webSocketClient?.connect(ipAddress);
	}

	function leaveServer()
	{
		webSocketClient?.disconnect();
	}

	onMount(() =>
	{
		webSocketClient = WebSocketClient.getInstance();
	});
</script>

<div class="h-screen flex flex-col">

	<div class="flex-none">
		<div class="flex justify-between h-12">
			{#if getSettings().isConnectedToSelf && webSocketClient?.connectionStatus == `Connected`}
				<div class="w-2/5 border text-center">
					<button class="btn btn-error w-full h-full rounded-none" onclick={() => { void stopServer(); }}>Stop Server</button>
				</div>
			{:else if webSocketClient?.connectionStatus == `Connected`}
				<div class="w-2/5 border text-center">
					<button class="btn btn-error w-full h-full rounded-none" onclick={() => { leaveServer(); }}>Leave Server</button>
				</div>
			{:else if webSocketClient?.connectionStatus == `Connecting`}
				<div class="w-2/5 border text-center">
					<div class="w-full h-full items-center justify-center flex">Please wait...</div>
				</div>
			{:else}
				<div class="w-1/5 border text-center">
					<button class="btn btn-primary w-full h-full rounded-none" onclick={() => { void launchServer(); }}>Host Game</button>
				</div>
				<div class="w-1/5 border text-center">
					<button class="btn btn-primary w-full h-full rounded-none" onclick={() => { joinServer(); }}>Join Game</button>
				</div>
			{/if}
			<div class="w-3/5 border text-center">
				<input class="input input-bordered text-center w-full h-full rounded-none" bind:value={ipAddress}/>
			</div>
		</div>
	</div>

	<div class="flex-grow flex">
		<div class="w-3/5 border text-center">
			<div class="flex flex-col justify-center h-full">
				<span class="text-4xl">Settings</span>
			</div>
		</div>
		<div class="w-2/5 flex flex-col">
			<div class="flex-1 border text-center">Players</div>
			<div class="flex-1 border text-center flex flex-col">
				<div class="flex-grow flex flex-col">
					<div>{getSettings().userName}</div>
					<div>test message</div>
				</div>
				<div class="flex justify-between h-12">
					<input class="input input-bordered text-center w-full rounded-none"/>
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
