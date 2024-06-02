import * as d3 from "d3";
type PieChartDataType = { name: string; value: number };

export function addPieChart(chartDiv: HTMLElement, data: PieChartDataType[], colors: Record<string, string>)
{
	type ArcDataType = d3.PieArcDatum<PieChartDataType>;

	const width = 400;
	const height = 400;
	const radius = Math.min(width, height) / 2;

	const svg = d3.select(chartDiv)
		.append(`svg`)
		.attr(`width`, `100%`)
		.attr(`height`, `100%`)
		.attr(`viewBox`, `0, 0, ${width.toString()}, ${height.toString()}`);

	const arc = d3.arc<ArcDataType>()
		.innerRadius(radius * 0.70)
		.outerRadius(radius - 1);

	const color = d3.scaleOrdinal(Object.keys(colors), Object.values(colors));

	const pie = d3.pie<PieChartDataType>()
		.padAngle(0.05)
		.value(d => d.value);

	svg.append(`g`)
		.selectAll()
		.data(pie(data))
		.join(`path`)
		.attr(`fill`, d => color(d.data.name))
		.attr(`d`, arc)
		.attr(`transform`, `translate(${(width / 2).toString()}, ${(height / 2).toString()})`);

	return svg.node();
}
