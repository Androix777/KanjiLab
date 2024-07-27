<script lang="ts">
    import type { ClientInfo } from "$lib/types";

	type Props = {
		clientInfo: ClientInfo;
		isMe: boolean;
	};

	const
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		{
			clientInfo = {
				id: `NULL`,
				name: `NULL`,
				is_admin: false,
			},
			isMe = false,
		}: Props = $props();
</script>

	<div class="text-primary-content p-2 m-1 rounded {clientInfo.is_admin ? `bg-warning` : `bg-primary`} {isMe ? `border-2 border-accent` : ``}">
	{clientInfo.name}
</div>
