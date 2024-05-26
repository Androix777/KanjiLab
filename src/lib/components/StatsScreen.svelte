<script lang="ts">
	import DatabaseService from "$lib/databaseService";
    import type { StatsInfo } from "$lib/types";

	let stats: StatsInfo | null = $state(null);

	async function getStats()
	{
		const databaseService = await DatabaseService.getInstance();
		stats = await databaseService.getStats();
		console.log(stats.correctCount);
		console.log(stats.wrongCount);
	}

	$effect(() =>
	{
		void getStats();
	});
</script>

{#if stats != null}
	<div>
		Answers {stats.correctCount + stats.wrongCount} / {stats.correctCount} / {stats.wrongCount}
	</div>
{/if}
