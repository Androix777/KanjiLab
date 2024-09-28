<script lang="ts">
	import ThemeSelect from "$lib/components/ThemeSelect.svelte";
	import { createAccount, getAccounts, removeAccount, renameAccount } from "$lib/cryptoTools";
	import { getSettings } from "$lib/globalSettings.svelte";
	import jdenticon from "jdenticon/standalone";
	import { onMount } from "svelte";
	import AutoComplete from "./AutoComplete.svelte";

	let items: string[] = $state([]);
	let currentPublicKey: string = $state(``);

	onMount(async () =>
	{
		getSettings().userName.set((await getAccounts())[getSettings().currentAccount.get()].name);
		refreshItems();
	});

	async function refreshItems()
	{
		items = (await getAccounts()).map((account) =>
		{
			return account.name;
		});
		currentPublicKey = (await getAccounts())[getSettings().currentAccount.get()].publicKey;
	}
</script>

<div class="p-4">
	<div class="flex flex-column justify-center items-center">
		<div class="card card-bordered bg-base-100 shadow-xl mb-4 p-4 min-w-96 max-w-screen-sm flex-1">
			<div class="card-title">Global settings</div>
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
							getSettings().userName.set((await getAccounts())[getSettings().currentAccount.get()].name);
							refreshItems();
						}
					}}
					value={getSettings().userName.get()}
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
						onSelect={async (selectedIndex: number, selectedItem: string) =>
						{
							getSettings().currentAccount.set(selectedIndex);
							getSettings().userName.set((await getAccounts())[getSettings().currentAccount.get()].name);
							refreshItems();
						}}
					/>
				</div>
			</div>
			<div class="flex flex-row mt-4">
				<div class="flex-1 my-auto"></div>
				<div class="w-1/2 flex-none flex flex-row items-center justify-evenly">
					<div class="w-16 [&>*:only-child]:max-w-full [&>*:only-child]:max-h-full">
						{@html jdenticon.toSvg(currentPublicKey, 80)}
					</div>
					<button
						class="btn btn-primary"
						onclick={async () =>
						{
							await createAccount("New account");
							getSettings().currentAccount.set((await getAccounts()).length - 1);
							getSettings().userName.set((await getAccounts())[getSettings().currentAccount.get()].name);
							refreshItems();
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

							getSettings().userName.set((await getAccounts())[getSettings().currentAccount.get()].name);
							refreshItems();
						}}
					>Delete</button>
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
