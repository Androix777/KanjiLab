<script lang="ts">
	type Props = {
		player: string;
		message: string;
	};

	const
	{
		player = `NULL`,
		message = `NULL`,
	}: Props = $props();
</script>

<div class="text-left px-2 pl-2 pr-5 -mr-4">
	<span class="font-semibold">{player}:</span>
	<span class="break-words">{message}</span>
</div>
