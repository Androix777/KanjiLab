<script lang="ts">
	import ThemeSelect from "$lib/components/ThemeSelect.svelte";
	import { getSettings } from "$lib/globalSettings.svelte";
	import { createAccount, getAccounts, removeAccount, renameAccount } from "$lib/networkTools";
	import WebSocketClient from "$lib/webSocketClient.svelte";
	import { onMount } from "svelte";
	import AutoComplete from "./AutoComplete.svelte";
	import Avatar from "./Avatar.svelte";

	const client = WebSocketClient.getInstance();

	let items: string[] = $state([]);
	let currentPublicKey: string = $state(``);
	let currentName: string = $state(``);

	onMount(() =>
	{
		void refreshItems();
	});

	async function refreshItems()
	{
		const accounts = await getAccounts();
		items = accounts.map((account) =>
		{
			return account.name;
		});
		currentPublicKey = accounts[getSettings().currentAccount.get()].publicKey;
		currentName = accounts[getSettings().currentAccount.get()].name;

		client.accountKey = currentPublicKey;
		client.accountName = currentName;
	}
</script>

<div class="p-4">
	<div class="flex flex-column justify-center items-center">
		<div class="card card-bordered bg-base-100 shadow-xl mb-4 p-4 min-w-96 max-w-screen-sm flex-1">
			<div class="card-title">Global settings</div>
			<div class="flex flex-row mt-4">
				<div class="flex-1 text-left my-auto">
					Host port
				</div>
				<input
					oninput={(event) =>
					{
						if (event.target instanceof HTMLInputElement)
						{
							getSettings().hostPort.set(event.target.value);
						}
					}}
					value={getSettings().hostPort.get()}
					class="flex-none input input-bordered text-center w-1/2"
				/>
			</div>
			<div class="flex flex-row mt-4">
				<div class="flex-1 text-left my-auto">
					Player name
				</div>
				<input
					oninput={async (event) =>
					{
						if (event.target instanceof HTMLInputElement)
						{
							await renameAccount((await getAccounts())[getSettings().currentAccount.get()].publicKey, event.target.value);
							void refreshItems();
						}
					}}
					value={currentName}
					class="flex-none input input-bordered text-center w-1/2"
				/>
			</div>
			<div class="flex flex-row mt-4">
				<div class="flex-1 text-left my-auto">
					Account
				</div>
				<div class="flex-none text-center w-1/2">
					<AutoComplete
						items={items}
						selectedIndex={getSettings().currentAccount.get()}
						onSelect={(selectedIndex: number) =>
						{
							getSettings().currentAccount.set(selectedIndex);
							void refreshItems();
						}}
					/>
				</div>
			</div>
			<div class="flex flex-row mt-4">
				<div class="flex-1 my-auto"></div>
				<div class="w-1/2 flex-none flex flex-row items-center justify-evenly">
					<Avatar key={currentPublicKey} />
					<button
						class="btn btn-primary"
						onclick={async () =>
						{
							await createAccount("New account");
							getSettings().currentAccount.set((await getAccounts()).length - 1);
							void refreshItems();
						}}
					>Create</button>
					<button
						class="btn btn-outline btn-error"
						onclick={async () =>
						{
							await removeAccount((await getAccounts())[getSettings().currentAccount.get()].publicKey);

							if ((await getAccounts()).length == 0)
							{
								await createAccount("New account");
								getSettings().currentAccount.set(0);
							}
							else
							{
								if (getSettings().currentAccount.get() == (await getAccounts()).length)
								{
									getSettings().currentAccount.set((await getAccounts()).length - 1);
								}
							}

							void refreshItems();
						}}
					>Delete</button>
				</div>
			</div>
			<div class="flex flex-row mt-4">
				<div class="flex-1 text-left my-auto">
					Avatar style
				</div>
				<div class="w-1/2">
					<select
						class="select select-bordered w-full"
						value={getSettings().avatars.get()}
						onchange={(event) =>
						{
							if (event.target instanceof HTMLSelectElement)
							{
								getSettings().avatars.set(parseInt(event.target.value));
							}
						}}
					>
						{#each [0, 1] as styleID}
							<option value={styleID}>{styleID == 0 ? `Jdenticons` : `Blockies`}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="flex flex-row mt-4">
				<div class="flex-1 text-left my-auto">
					Visual theme
				</div>
				<div class="w-1/2">
					<ThemeSelect />
				</div>
			</div>
		</div>
	</div>
</div>
