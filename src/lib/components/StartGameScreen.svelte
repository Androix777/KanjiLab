<script lang="ts">
	import { LAUNCH_SERVER, STOP_SERVER } from "$lib/tauriFunctions";
	import { invoke } from "@tauri-apps/api/core";
	import { getSettings } from "$lib/globalSettings.svelte";
	import WebSocketClient from "$lib/webSocketClient.svelte";
    import { onMount } from "svelte";
    import PlayerListCard from "./PlayerListCard.svelte";
    import GameScreen from "./GameScreen.svelte";
    import MessageCard from "./MessageCard.svelte";
    import GameSettings from "./GameSettings.svelte";
    import { flip } from "svelte/animate";

	let webSocketClient: WebSocketClient | null = $state(null);
	let chatMessage: string = $state(``);
	let chatDiv: HTMLElement;

	async function launchServer()
	{
		getSettings().adminPassword.set(await invoke(LAUNCH_SERVER));
		webSocketClient = WebSocketClient.getInstance();
		webSocketClient.isConnectedToSelf = true;
		await webSocketClient.connectToServer(`ws://127.0.0.1:8080`);
		await webSocketClient.makeAdmin();
	}

	async function stopServer()
	{
		webSocketClient = WebSocketClient.getInstance();
		webSocketClient.isConnectedToSelf = false;
		leaveServer();
		await invoke(STOP_SERVER);
	}

	async function stopGame()
	{
		await webSocketClient?.stopGame();
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
		const observer = new MutationObserver(() =>
		{
			chatDiv.scroll({ top: chatDiv.scrollHeight });
		});
		observer.observe(chatDiv, { childList: true });
	});
</script>

<div class="h-screen flex flex-col p-4">

	<div class="card card-bordered bg-base-100 shadow-xl mb-4 p-4">
		<div class="flex flex-none">
			{#if webSocketClient?.isConnectedToSelf && webSocketClient.connectionStatus == `Connected`}
				<button class="btn btn-primary mx-2"
						onclick={() => { void stopGame(); }}
						disabled={!webSocketClient.isGameStarted}>Stop Game</button>
				<button class="btn btn-outline btn-error"
						onclick={() => { void stopServer(); }}>Stop Server</button>
			{:else}
				{#if webSocketClient?.connectionStatus == `Disconnected`}
					<button class="btn btn-primary"
							onclick={() => { void launchServer(); }}>Host Game</button>
				{/if}
				<div class="text-center join ml-auto mr-0">
					<input class="input input-bordered text-center join-item"
							value={getSettings().ipAddress.get()}
							disabled={ webSocketClient?.connectionStatus != `Disconnected` }
							oninput={(event) =>
							{
								if (event.target instanceof HTMLInputElement)
								{
									getSettings().ipAddress.set(event.target.value);
								}
							}}
							/>
					{#if webSocketClient?.connectionStatus == `Connected`}
						<button class="btn btn-outline btn-error join-item"
								onclick={() => { leaveServer(); }}>Leave Server</button>
					{:else}
						<button class="btn btn-primary join-item"
								onclick={() => { void joinServer(); }}
								disabled={ webSocketClient?.connectionStatus == `Connecting` }>Join Game</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<div class="flex-grow flex min-h-0 flex-row">
		<div class="text-center flex flex-1 min-h-0 card card-bordered bg-base-100 shadow-xl p-4">
			{#if webSocketClient?.isGameStarted}
				<GameScreen
					gameHistory = { webSocketClient.gameHistory }
					clientID = { webSocketClient.id }
					roundDuration = {webSocketClient.roundDuration}
					onAnswer={(answer: string) => webSocketClient?.sendAnswer(answer)} />
			{:else if true}
				<GameSettings
					startFunction={() => { void webSocketClient?.startGame(); }}
					isAdmin={webSocketClient?.isAdmin || false}
				/>
			{/if}
		</div>
		<div class="flex flex-col ml-4" style="width: 30vw;">
			<div class="flex-1 text-center card card-bordered bg-base-100 shadow-xl overflow-y-auto overflow-x-hidden p-4 mb-4" style="scrollbar-width: none;">
					{#if webSocketClient && webSocketClient.clientList}
						{#each webSocketClient.clientList as client(client.id)}
							<div animate:flip>
								<PlayerListCard
									clientInfo={client}
									isMe={client.id == webSocketClient.id}
									gameHistory={webSocketClient.gameHistory}
									score={webSocketClient.gameHistory.reduce((acc, round) => acc + (round.answers.get(client.id)?.answerStatus == `Correct` ? 1 : 0), 0) || 0} />
							</div>
						{/each}
					{/if}
			</div>
			<div class="flex-1 text-center flex flex-col min-h-0 card card-bordered bg-base-100 shadow-xl p-4">
				<div class="flex-grow flex flex-col overflow-y-auto overflow-x-hidden [&>*:nth-child(even)]:bg-base-200 pb-2" style="scrollbar-gutter: stable;" bind:this={chatDiv}>
					{#if webSocketClient && webSocketClient.chatList}
						{#each webSocketClient.chatList as chatMessage}
							<MessageCard player={chatMessage.name} message={chatMessage.message} />
						{/each}
					{/if}
				</div>
				<div class="join">
					<input
						bind:value={chatMessage}
						onkeydown={chatOnKeyDown}
						placeholder="{getSettings().userName.get()}:"
						class="input input-bordered text-left w-full placeholder:text-base-content placeholder:text-opacity-30 join-item"/>
					<button class="btn btn-primary join-item" onclick={() => { sendChatMessage(); }}>Send</button>
				</div>
			</div>
		</div>
	</div>
</div>
