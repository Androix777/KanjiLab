<script lang="ts">
	import { LAUNCH_SERVER, STOP_SERVER } from "$lib/tauriFunctions";
	import { invoke } from "@tauri-apps/api/core";
	import { getSettings } from "$lib/globalSettings.svelte";
	import WebSocketClient from "$lib/webSocketClient.svelte";
    import { onMount } from "svelte";
    import PlayerListCard from "./PlayerListCard.svelte";
    import GameScreen from "./GameScreen.svelte";
    import MessageCard from "./MessageCard.svelte";

	let webSocketClient: WebSocketClient | null = $state(null);
	let chatMessage: string = $state(``);

	async function launchServer()
	{
		getSettings().adminPassword.set(await invoke(LAUNCH_SERVER));
		webSocketClient = WebSocketClient.getInstance();
		webSocketClient.isConnectedToSelf = true;
		await webSocketClient.connectToServer(getSettings().ipAddress.get());
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
		await webSocketClient?.connectToServer(getSettings().ipAddress.get());
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
			value={getSettings().ipAddress.get()}
			oninput={(event) =>
			{
				if (event.target instanceof HTMLInputElement)
				{
					getSettings().ipAddress.set(event.target.value);
				}
			}}
			/>
		</div>
	</div>

	<div class="flex-grow flex min-h-0 flex-row">
		<div class="border text-center flex flex-1 min-h-0">
			{#if webSocketClient?.isGameStarted}
				<GameScreen
					question={webSocketClient.gameHistory[webSocketClient.gameHistory.length - 1]?.question.question || ``}
					currentAnswerStatus={webSocketClient.gameHistory[webSocketClient.gameHistory.length - 1]?.answers.get(webSocketClient.id)?.answerStatus || `Unknown`}
					currentAnswer={webSocketClient.gameHistory[webSocketClient.gameHistory.length - 1]?.answers.get(webSocketClient.id)?.answer || ``}
					previousAnswerStatus={webSocketClient.gameHistory[webSocketClient.gameHistory.length - 2]?.answers.get(webSocketClient.id)?.answerStatus || `Unknown`}
					previousAnswer={webSocketClient.gameHistory[webSocketClient.gameHistory.length - 2]?.answers.get(webSocketClient.id)?.answer || ``}
					onAnswer={(answer: string) => webSocketClient?.sendAnswer(answer)} />
			{:else if true}
				<div class="flex flex-col flex-grow justify-center h-full">
					<span class="text-4xl">Settings</span>
				</div>
			{/if}
		</div>
		<div class="flex flex-col" style="width: 30vw;">
			<div class="flex-1 border text-center overflow-y-auto">
					{#if webSocketClient && webSocketClient.clientList}
						{#each webSocketClient.clientList as client}
							<PlayerListCard
								clientInfo={client}
								isMe={client.id == webSocketClient.id}
								currentAnswerStatus={webSocketClient.gameHistory[webSocketClient.gameHistory.length - 1]?.answers.get(client.id)?.answerStatus || `Unknown`}
								currentAnswer={webSocketClient.gameHistory[webSocketClient.gameHistory.length - 1]?.answers.get(client.id)?.answer || ``}
								previousAnswerStatus={webSocketClient.gameHistory[webSocketClient.gameHistory.length - 2]?.answers.get(client.id)?.answerStatus || `Unknown`}
								previousAnswer={webSocketClient.gameHistory[webSocketClient.gameHistory.length - 2]?.answers.get(client.id)?.answer || ``} />
						{/each}
					{/if}
			</div>
			<div class="flex-1 border text-center flex flex-col min-h-0">
				<div class="flex-grow flex flex-col overflow-y-auto overflow-x-hidden [&>*:nth-child(even)]:bg-base-200" style="scrollbar-gutter: stable;">
					{#if webSocketClient && webSocketClient.chatList}
						{#each webSocketClient.chatList as chatMessage}
							<MessageCard player={chatMessage.name} message={chatMessage.message} />
						{/each}
					{/if}
				</div>
				<div class="flex justify-between h-12">
					<input
						bind:value={chatMessage}
						onkeydown={chatOnKeyDown}
						placeholder="{getSettings().userName.get()}:"
						class="input input-bordered text-left w-full rounded-none placeholder:text-base-content placeholder:text-opacity-30"/>
					<button class="btn btn-primary w-12 rounded-none" onclick={() => { sendChatMessage(); }}>Send</button>
				</div>
			</div>
		</div>
	</div>

	<div class="text-center h-12">
		<div class="border-x">
			<button class="btn btn-success w-full h-full rounded-none" onclick={() => { void webSocketClient?.startGame(); }} disabled={!webSocketClient?.isAdmin}>START</button>
		</div>
	</div>

</div>
