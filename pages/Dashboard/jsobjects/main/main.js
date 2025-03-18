export default {
	async fetchEndangeredData() {
		try {
			// Execute the MySQL query to get species counts
			let response1 = await endangerLevel.run();
			let response2 = await totalAnimals.run();
			let response3 = await totalOrganizations.run();
			let response4 = await totalSpecies.run();
			let response5 = await totalSurveys.run();

			// Map the results to a format compatible with Appsmith charts
			let chartData = response.map(item => ({
				x: item.endanger_level,  // Category label
				y: item.species_count    // Count of species
			}));

			return chartData; // Appsmith uses this for the Pie Chart widget
		} catch (error) {
			console.error("Error fetching endangered species data:", error);
			return [];
		}
	}
};