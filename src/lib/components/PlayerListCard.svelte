<script lang="ts">
	type Props = {
		playerName: string;
	};

	const
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		{
			playerName = ``,
		}: Props = $props();
</script>

<div class="bg-primary text-primary-content p-2 m-1 rounded">
	{playerName}
</div>
