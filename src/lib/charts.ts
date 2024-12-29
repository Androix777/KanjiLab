/* eslint-disable @typescript-eslint/no-unused-vars */
import * as d3 from "d3";

const BASE_100: string = `oklch(var(--b1))`;
const BASE_CONTENT: string = `oklch(var(--bc))`;


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


type TableDataType = {
    axisValues: number[];
    intersectionMatrix: number[][];
};

type Threshold = {
    value: number;
    color: string;
};

export class HeatmapTable {
    private svg?: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private tooltip?: d3.Selection<HTMLDivElement, unknown, null, undefined>;

    public width: number = 800;
    public height: number = 800;
    public margin = { top: 60, right: 30, bottom: 30, left: 60 };
    public useTooltips: boolean = true;
    public thresholds: Threshold[] = [];
    public highlightColor: string = "rgba(255, 255, 255, 0.1)";

    constructor(
        private tableDiv: HTMLElement,
        private data: TableDataType,
    ) {}

    private getColor(value: number): string {
        for (let i = this.thresholds.length - 1; i >= 0; i--) {
            if (value >= this.thresholds[i].value) {
                return this.thresholds[i].color;
            }
        }
        return '#gray';
    }

    private getContrastColor(backgroundColor: string): string {
        const hex = backgroundColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#ffffff';
    }

    private showTooltip(i: number, j: number): void {
        this.tooltip
            ?.style("visibility", "visible")
            .html(
                `Min: ${this.data.axisValues[i]}<br>` +
                `Max: ${this.data.axisValues[j]}<br>` +
                `Value: ${this.data.intersectionMatrix[i][j]}`
            );
    }

    private moveTooltip(event: MouseEvent): void {
        this.tooltip
            ?.style("top", `${event.pageY - 10}px`)
            .style("left", `${event.pageX + 10}px`);
    }

    private hideTooltip(): void {
        this.tooltip?.style("visibility", "hidden");
    }

    private highlightRowAndColumn(i: number, j: number, g: d3.Selection<SVGGElement, unknown, null, undefined>): void {
        g.append("rect")
            .attr("class", "highlight-row")
            .attr("x", -this.margin.left)
            .attr("y", i * (this.height - this.margin.top - this.margin.bottom) / (this.data.axisValues.length - 1))
            .attr("width", this.width)
            .attr("height", (this.height - this.margin.top - this.margin.bottom) / (this.data.axisValues.length - 1))
            .attr("fill", this.highlightColor)
            .attr("pointer-events", "none");

        g.append("rect")
            .attr("class", "highlight-column")
            .attr("x", j * (this.width - this.margin.left - this.margin.right) / (this.data.axisValues.length - 1))
            .attr("y", -this.margin.top)
            .attr("width", (this.width - this.margin.left - this.margin.right) / (this.data.axisValues.length - 1))
            .attr("height", this.height)
            .attr("fill", this.highlightColor)
            .attr("pointer-events", "none");
    }

    private removeHighlight(): void {
        this.svg?.selectAll(".highlight-row").remove();
        this.svg?.selectAll(".highlight-column").remove();
    }

    public draw(): void {
        this.remove();

        const innerWidth = this.width - this.margin.left - this.margin.right;
        const innerHeight = this.height - this.margin.top - this.margin.bottom;
        const cellWidth = innerWidth / (this.data.axisValues.length - 1);
        const cellHeight = innerHeight / (this.data.axisValues.length - 1);

        this.svg = d3
            .select(this.tableDiv)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${this.width} ${this.height}`);

        this.tooltip = d3
            .select(this.tableDiv)
            .append("div")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", BASE_100)
            .style("border", "solid")
            .style("border-width", "1px")
            .style("border-radius", "5px")
            .style("padding", "5px");

        const g = this.svg
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        const xAxis = g
            .append("g")
            .attr("transform", `translate(0,-10)`)
            .selectAll("text")
            .data(this.data.axisValues.slice(1))
            .enter()
            .append("text")
            .attr("x", (d, i) => i * cellWidth + cellWidth / 2)
            .attr("text-anchor", "middle")
            .attr("fill", BASE_CONTENT)
            .text(d => d);

        const yAxis = g
            .append("g")
            .attr("transform", `translate(-10,0)`)
            .selectAll("text")
            .data(this.data.axisValues.slice(0, -1))
            .enter()
            .append("text")
            .attr("y", (d, i) => i * cellHeight + cellHeight / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "end")
            .attr("fill", BASE_CONTENT)
            .text(d => d);

        for (let i = 0; i < this.data.axisValues.length - 1; i++) {
            for (let j = 1; j < this.data.axisValues.length; j++) {
                if (this.data.axisValues[i] < this.data.axisValues[j]) {
                    const cellColor = this.getColor(this.data.intersectionMatrix[i][j]);
                    const textColor = this.getContrastColor(cellColor);

                    const cellGroup = g.append("g");

                    const cell = cellGroup
                        .append("rect")
                        .attr("x", (j-1) * cellWidth)
                        .attr("y", i * cellHeight)
                        .attr("width", cellWidth)
                        .attr("height", cellHeight)
                        .attr("fill", cellColor)
                        .attr("stroke", "white");

                    const text = cellGroup
                        .append("text")
                        .attr("x", (j-1) * cellWidth + cellWidth / 2)
                        .attr("y", i * cellHeight + cellHeight / 2)
                        .attr("text-anchor", "middle")
                        .attr("dy", "0.35em")
                        .attr("fill", textColor)
                        .style("font-weight", "bold")
                        .text(this.data.intersectionMatrix[i][j]);

                    if (this.useTooltips) {
                        const mouseoverHandler = () => {
                            this.showTooltip(i, j);
                            this.highlightRowAndColumn(i, j-1, g);
                        };

                        const mousemoveHandler = (event: MouseEvent) => {
                            this.moveTooltip(event);
                        };

                        const mouseoutHandler = () => {
                            this.hideTooltip();
                            this.removeHighlight();
                        };

                        cell
                            .on("mouseover", mouseoverHandler)
                            .on("mousemove", mousemoveHandler)
                            .on("mouseout", mouseoutHandler);

                        text
                            .on("mouseover", mouseoverHandler)
                            .on("mousemove", mousemoveHandler)
                            .on("mouseout", mouseoutHandler);
                    }
                }
            }
        }
    }

    public remove(): void {
        this.svg?.remove();
        if (this.useTooltips) {
            this.tooltip?.remove();
        }
    }
}