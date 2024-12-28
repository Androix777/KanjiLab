<script lang="ts">
	import { getSettings } from "$lib/globalSettings.svelte";
	import { LAUNCH_SERVER, STOP_SERVER } from "$lib/tauriFunctions";
	import type { AnswerStats } from "$lib/types";
	import WebSocketClient from "$lib/webSocketClient.svelte";
	import { invoke } from "@tauri-apps/api/core";
	import { onMount } from "svelte";
	import { flip } from "svelte/animate";
	import { fade } from "svelte/transition";
	import GameScreen from "./GameScreen.svelte";
	import GameSettings from "./GameSettings.svelte";
	import MessageCard from "./MessageCard.svelte";
	import PlayerListCard from "./PlayerListCard.svelte";

	let webSocketClient: WebSocketClient = $state(WebSocketClient.getInstance());
	let chatMessage: string = $state(``);
	let chatDiv: HTMLElement;
	let activeTab = $state(0);

	async function launchServer()
	{
		getSettings().adminPassword.set(await invoke(LAUNCH_SERVER));
		webSocketClient.isConnectedToSelf = true;
		await webSocketClient.connectToServer(`ws://127.0.0.1:8080`);
		await webSocketClient.makeAdmin();
	}

	async function stopServer()
	{
		leaveServer();
		await invoke(STOP_SERVER);
	}

	async function stopGame()
	{
		await webSocketClient.stopGame();
	}

	async function joinServer()
	{
		webSocketClient.isConnectedToSelf = false;
		await webSocketClient.connectToServer(`ws://${getSettings().ipAddress.get()}:${getSettings().joinPort.get()}`);
	}

	function leaveServer()
	{
		webSocketClient.disconnectFromServer();
	}

	function sendChatMessage()
	{
		void webSocketClient.sendChatMessage(chatMessage);
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

	function calculateAnswerSum(playerId: number, answerStatsArray: AnswerStats[])
	{
		let answerSum = 0;
		answerStatsArray.forEach((answerStats) => answerSum += (answerStats.userId == playerId && answerStats.isCorrect) ? 1 : 0);
		return answerSum;
	}

	function getPlayerIds(answerStatsArray: AnswerStats[])
	{
		let playerIds: Set<number> = new Set<number>();
		answerStatsArray.forEach((answerStats) => playerIds.add(answerStats.userId));
		return Array.from(playerIds.values());
	}

	$effect(() =>
	{
		webSocketClient.lastGameId;
		webSocketClient.gameStatus;
		if (webSocketClient.lastGameId != 0 && webSocketClient.gameStatus == `Lobby`)
		{
			activeTab = 1;
		}
		else
		{
			activeTab = 0;
		}
	});

	onMount(() =>
	{
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
			{#if webSocketClient.isAdmin && webSocketClient.gameStatus != `Off` && webSocketClient.gameStatus != `Connecting`}
				<button
					class="btn btn-primary mx-2"
					onclick={() =>
					{
						void stopGame();
					}}
					disabled={webSocketClient.gameStatus != `WaitingQuestion` && webSocketClient.gameStatus != `AnswerQuestion`}
				>Stop Game</button>
				{#if webSocketClient.isConnectedToSelf}
					<button
						class="btn btn-outline btn-error"
						onclick={() =>
						{
							void stopServer();
						}}
					>Stop Server</button>
				{/if}
			{:else}
				{#if webSocketClient.gameStatus == `Off`}
					<button
						class="btn btn-primary"
						onclick={() =>
						{
							void launchServer();
						}}
					>Host Game</button>
				{/if}
				<div class="text-center join ml-auto mr-0">
					<input
						class="input input-bordered text-center join-item w-40"
						value={getSettings().ipAddress.get()}
						disabled={webSocketClient.gameStatus != `Off`}
						oninput={(event) =>
						{
							if (event.target instanceof HTMLInputElement)
							{
								getSettings().ipAddress.set(event.target.value);
							}
						}}
					/>
					<input
						class="input input-bordered text-center join-item w-20"
						value={getSettings().joinPort.get()}
						disabled={webSocketClient.gameStatus != `Off`}
						oninput={(event) =>
						{
							if (event.target instanceof HTMLInputElement)
							{
								getSettings().joinPort.set(event.target.value);
							}
						}}
					/>
					{#if webSocketClient.gameStatus != `Off` && webSocketClient.gameStatus != `Connecting`}
						<button
							class="btn btn-outline btn-error join-item"
							onclick={() =>
							{
								leaveServer();
							}}
						>Leave Server</button>
					{:else}
						<button
							class="btn btn-primary join-item"
							onclick={() =>
							{
								void joinServer();
							}}
							disabled={webSocketClient.gameStatus == `Connecting`}
						>Join Game</button>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<div class="flex-grow flex min-h-0 flex-row">
		<div class="text-center flex flex-1 min-h-0 card card-bordered bg-base-100 shadow-xl p-4">
			{#if webSocketClient.gameStatus == `Lobby` && webSocketClient.lastGameId != 0}
				<div role="tablist" class="tabs tabs-bordered">
					<button
						role="tab"
						class="tab {activeTab == 0 ? `tab-active` : ``}"
						onclick={() => activeTab = 0}
					>Game Settings</button>
					<button
						role="tab"
						class="tab {activeTab == 1 ? `tab-active` : ``}"
						onclick={() => activeTab = 1}
					>Last Game Stats</button>
				</div>
			{/if}

			{#if webSocketClient.gameStatus == `WaitingQuestion` || webSocketClient.gameStatus == `AnswerQuestion`}
				<GameScreen
					gameHistory={webSocketClient.gameHistory}
					clientID={webSocketClient.id}
					roundDuration={getSettings().roundDuration.get()}
					timerValue={webSocketClient.timerValue}
					roundsCount={getSettings().roundsCount.get()}
					currentRound={webSocketClient.currentRound}
					onAnswer={(answer: string) => webSocketClient.sendAnswer(answer)}
				/>
			{:else if activeTab == 0}
				<GameSettings
					startFunction={() =>
					{
						void webSocketClient.startGame();
					}}
					isAdmin={webSocketClient.isAdmin || false}
				/>
			{:else if activeTab == 1}
				{#if webSocketClient.gameStatus == `Lobby` && webSocketClient.lastGameId != 0}
					{#await Promise.all([webSocketClient.getCurrentGameStats(), webSocketClient.getCurrentGameAnswerStats()])}
						Loading stats...
					{:then [currentGameStats, currentGameAnswerStats]}
						{#each getPlayerIds(currentGameAnswerStats) as playerId}
							<div>
								{`Player ${playerId}: ${calculateAnswerSum(playerId, currentGameAnswerStats)}/${currentGameStats.roundsCount} correct answers`}
							</div>
						{/each}
					{/await}
				{/if}
			{/if}
		</div>
		<div class="flex flex-col ml-4" style="width: 30vw">
			<div class="flex-1 text-center card card-bordered bg-base-100 shadow-xl overflow-y-auto overflow-x-hidden p-4 mb-4" style="scrollbar-width: none">
				{#if webSocketClient.clientList}
					{#each webSocketClient.clientList as client (client.id)}
						<div animate:flip>
							<PlayerListCard
								clientInfo={client}
								isMe={client.id == webSocketClient.id}
								gameHistory={webSocketClient.gameHistory}
							/>
						</div>
					{/each}
				{/if}
			</div>
			<div class="flex-1 text-center flex flex-col min-h-0 card card-bordered bg-base-100 shadow-xl p-4">
				<div class="flex-grow flex flex-col overflow-y-auto overflow-x-hidden [&>*:nth-child(even)]:bg-base-200 pb-2" style="scrollbar-gutter: stable" bind:this={chatDiv}>
					{#if webSocketClient.chatList}
						{#each webSocketClient.chatList as chatMessage}
							<div transition:fade>
								<MessageCard player={chatMessage.name} message={chatMessage.message} />
							</div>
						{/each}
					{/if}
				</div>
				<div class="join">
					<input
						bind:value={chatMessage}
						disabled={webSocketClient.gameStatus == `Off` || webSocketClient.gameStatus == `Connecting`}
						onkeydown={chatOnKeyDown}
						placeholder="{getSettings().userName.get()}:"
						class="input input-bordered text-left w-full placeholder:text-base-content placeholder:text-opacity-30 join-item"
					/>
					<button
						class="btn btn-primary join-item"
						disabled={webSocketClient.gameStatus == `Off` || webSocketClient.gameStatus == `Connecting`}
						onclick={() =>
						{
							sendChatMessage();
						}}
					>Send</button>
				</div>
			</div>
		</div>
	</div>
</div>
