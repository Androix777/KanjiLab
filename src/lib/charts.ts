/* eslint-disable @typescript-eslint/no-unused-vars */
import * as d3 from "d3";

const BASE_100: string = `oklch(var(--b1))`;
const BASE_200: string = `oklch(var(--b2))`;
const BASE_300: string = `oklch(var(--b3))`;

type PieChartDataType = { name: string; value: number };

export class PieChart
{
	private svg?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
	private tooltip?: d3.Selection<HTMLDivElement, unknown, null, undefined>;

	public colors: string[] | Record<string, string> = [...d3.schemeCategory10];
	public width: number = 400;
	public height: number = 400;
	public innerRadius: number = 0.5;
	public outerRadius: number = 1;
	public padAngle: number = 0.05;
	public useTooltips: boolean = true;

	constructor(
		private chartDiv: HTMLElement,
		private data: PieChartDataType[],
	)
	{}

	public draw(): void
	{
		this.remove();

		this.svg = d3
			.select(this.chartDiv)
			.append(`svg`)
			.attr(`width`, `100%`)
			.attr(`height`, `100%`)
			.attr(`viewBox`, `0 0 ${this.width} ${this.height}`);

		this.tooltip = d3
			.select(this.chartDiv)
			.append(`div`)
			.style(`position`, `absolute`)
			.style(`visibility`, `hidden`)
			.style(`background-color`, BASE_100)
			.style(`border`, `solid`)
			.style(`border-width`, `1px`)
			.style(`border-radius`, `5px`)
			.style(`padding`, `5px`);

		type ArcDataType = d3.PieArcDatum<PieChartDataType>;
		const radius = Math.min(this.width, this.height) / 2;

		const arc = d3.arc<ArcDataType>()
			.innerRadius(radius * this.innerRadius)
			.outerRadius(radius * this.outerRadius);

		const color = Array.isArray(this.colors) ?
			d3.scaleOrdinal(this.colors) :
			d3.scaleOrdinal(
				Object.keys(this.colors),
				Object.values(this.colors),
			);

		const pie = d3.pie<PieChartDataType>()
			.padAngle(this.padAngle)
			.value(d => d.value);

		const arcs = this.svg
			.append(`g`)
			.selectAll(`path`)
			.data(pie(this.data))
			.join(`path`)
			.attr(`fill`, d => color(d.data.name))
			.attr(`d`, arc)
			.attr(`transform`, `translate(${this.width / 2}, ${this.height / 2})`);

		if (this.useTooltips)
		{
			arcs
				.on(`mouseover`, (event, d) =>
				{
					this.tooltip?.style(`visibility`, `visible`)
						.html(`${d.data.name}: ${d.data.value}`);
				})
				.on(`mousemove`, (event: MouseEvent) =>
				{
					this.tooltip?.style(`top`, `${event.pageY - 10}px`)
						.style(`left`, `${event.pageX + 10}px`);
				})
				.on(`mouseout`, () =>
				{
					this.tooltip?.style(`visibility`, `hidden`);
				});
		}
	}

	public remove(): void
	{
		this.svg?.remove();
		if (this.useTooltips)
		{
			this.tooltip?.remove();
		}
	}
}
