<script lang="ts">
	import DatabaseService from "$lib/databaseService";

	let word = $state("Word");

	async function generateWord()
	{
		try 
		{
			const databaseService = await DatabaseService.getInstance();
			const words = await databaseService.getRandomWords(1);
			word = words[0].text;
		}
		catch (error) 
		{
			console.error(error);
		}
	}

	void generateWord();
	</script>

<h1>{word}</h1>
<button onclick={generateWord}>Generate Word</button>
