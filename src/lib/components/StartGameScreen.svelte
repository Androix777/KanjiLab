<script lang="ts">
	import { LAUNCH_SERVER, STOP_SERVER } from "$lib/tauriFunctions";
	import { invoke } from "@tauri-apps/api/core";
	import { getSettings } from "$lib/globalSettings.svelte";
	import WebSocketClient from "$lib/webSocketClient.svelte";
    import { onMount } from "svelte";
    import PlayerListCard from "./PlayerListCard.svelte";
    import GameScreen from "./GameScreen.svelte";

	let webSocketClient: WebSocketClient | null = $state(null);
	let chatMessage: string = $state(``);

	async function launchServer()
	{
		getSettings().setAdminPassword(await invoke(LAUNCH_SERVER));
		webSocketClient = WebSocketClient.getInstance();
		webSocketClient.isConnectedToSelf = true;
		await webSocketClient.connectToServer(getSettings().ipAddress);
		await webSocketClient.makeAdmin();
	}

	async function stopServer()
	{
		webSocketClient = WebSocketClient.getInstance();
		webSocketClient.isConnectedToSelf = false;
		leaveServer();
		await invoke(STOP_SERVER);
	}

	async function joinServer()
	{
		await webSocketClient?.connectToServer(getSettings().ipAddress);
	}

	function leaveServer()
	{
		webSocketClient?.disconnectFromServer();
	}

	function sendChatMessage()
	{
		webSocketClient?.sendChatMessage(chatMessage);
		chatMessage = ``;
	}

	function chatOnKeyDown(event: KeyboardEvent)
	{
		if (event.key != `Enter`)
		{
			return;
		}
		sendChatMessage();
	}

	onMount(() =>
	{
		webSocketClient = WebSocketClient.getInstance();
	});
</script>

<div class="h-screen flex flex-col">

	<div class="flex-none">
		<div class="flex justify-between h-12">
			{#if webSocketClient?.isConnectedToSelf && webSocketClient.connectionStatus == `Connected`}
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
					<button class="btn btn-primary w-full h-full rounded-none" onclick={() => { void joinServer(); }}>Join Game</button>
				</div>
			{/if}
			<div class="w-3/5 border text-center">
				<input class="input input-bordered text-center w-full h-full rounded-none"
				value={getSettings().ipAddress}
				oninput={(event) =>
				{
					if (event.target instanceof HTMLInputElement)
					{
						getSettings().setIpAddress(event.target.value);
					}
				}}
				/>
			</div>
		</div>
	</div>

	<div class="flex-grow flex">
		<div class="w-3/5 border text-center">
			{#if webSocketClient?.isGameStarted}
				<GameScreen />
			{:else if true}
				<div class="flex flex-col justify-center h-full">
					<span class="text-4xl">Settings</span>
				</div>
			{/if}
		</div>
		<div class="w-2/5 flex flex-col">
			<div class="flex-1 border text-center overflow-y-auto">
				{#if webSocketClient && webSocketClient.clientList}
					{#each webSocketClient.clientList as client}
						<PlayerListCard clientInfo={client} isMe={client.id == webSocketClient.id} />
					{/each}
				{/if}
			</div>
			<div class="flex-1 border text-center flex flex-col">
				<div class="flex-grow flex flex-col">
					<div>{getSettings().userName}</div>
					{#if webSocketClient && webSocketClient.chatList}
						{#each webSocketClient.chatList as chatMessage}
							<div>{`${chatMessage.name}: ${chatMessage.message}`}</div>
						{/each}
					{/if}
				</div>
				<div class="flex justify-between h-12">
					<input bind:value={chatMessage} onkeydown={chatOnKeyDown} class="input input-bordered text-center w-full rounded-none"/>
					<button class="btn btn-primary w-12 rounded-none" onclick={() => { sendChatMessage(); }}>Send</button>
				</div>
			</div>
		</div>
	</div>

	<div class="flex-none text-center h-12">
		<div class="border-x">
			<button class="btn btn-success w-full h-full rounded-none" onclick={() => { void webSocketClient?.startGame(); }} disabled={!webSocketClient?.isAdmin}>START</button>
		</div>
	</div>

</div>
