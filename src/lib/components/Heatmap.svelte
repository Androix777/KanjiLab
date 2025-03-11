<script lang="ts">
    import * as d3 from "d3";
    import { onDestroy, onMount } from "svelte";

    const BASE_100 = `oklch(var(--b1))`;
    const BASE_CONTENT = `oklch(var(--bc))`;

    export type HeatmapData = {
        axisValues: number[];
        intersectionMatrix: number[][];
    };

    type Threshold = {
        value: number;
        color: string;
    };

    type Props = {
        data: HeatmapData;
        width?: number;
        height?: number;
        margin?: { top: number; right: number; bottom: number; left: number };
        useTooltips?: boolean;
        thresholds?: Threshold[];
        highlightColor?: string;
    };

    const {
        data,
        width = 800,
        height = 800,
        margin = { top: 60, right: 30, bottom: 30, left: 60 },
        useTooltips = true,
        thresholds = [],
        highlightColor = "rgba(255, 255, 255, 0.1)",
    }: Props = $props();

    let chartContainer: HTMLDivElement;
    let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = $state(null);
    let tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined> | null = $state(null);

    export function redraw() {
		console.log("redraw")
        cleanup();

        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const cellWidth = innerWidth / (data.axisValues.length - 1);
        const cellHeight = innerHeight / (data.axisValues.length - 1);

        svg = d3.select(chartContainer)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${width} ${height}`);

        if (useTooltips) {
            tooltip = d3.select(chartContainer)
                .append("div")
                .style("position", "absolute")
                .style("visibility", "hidden")
                .style("background-color", BASE_100)
                .style("border", "solid")
                .style("border-width", "1px")
                .style("border-radius", "5px")
                .style("padding", "5px");
        }

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        g.append("g")
            .attr("transform", `translate(0,-10)`)
            .selectAll("text")
            .data(data.axisValues.slice(1))
            .enter()
            .append("text")
            .attr("x", (_, i) => i * cellWidth + cellWidth / 2)
            .attr("text-anchor", "middle")
            .attr("fill", BASE_CONTENT)
            .text(d => d.toString());

        g.append("g")
            .attr("transform", `translate(-10,0)`)
            .selectAll("text")
            .data(data.axisValues.slice(0, -1))
            .enter()
            .append("text")
            .attr("y", (_, i) => i * cellHeight + cellHeight / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "end")
            .attr("fill", BASE_CONTENT)
            .text(d => d.toString());

        function getColor(value: number): string {
            for (let i = thresholds.length - 1; i >= 0; i--) {
                if (value >= thresholds[i].value) return thresholds[i].color;
            }
            return "#808080";
        }

        function getContrastColor(hex: string): string {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? "#000000" : "#ffffff";
        }

        function highlightRowAndColumn(i: number, j: number) {
            g.append("rect")
                .attr("class", "highlight-row")
                .attr("x", -margin.left)
                .attr("y", i * cellHeight)
                .attr("width", width)
                .attr("height", cellHeight)
                .attr("fill", highlightColor);

            g.append("rect")
                .attr("class", "highlight-column")
                .attr("x", j * cellWidth)
                .attr("y", -margin.top)
                .attr("width", cellWidth)
                .attr("height", height)
                .attr("fill", highlightColor);
        }

        function removeHighlight() {
            g.selectAll(".highlight-row, .highlight-column").remove();
        }

        for (let i = 0; i < data.axisValues.length - 1; i++) {
            for (let j = 1; j < data.axisValues.length; j++) {
                if (data.axisValues[i] < data.axisValues[j]) {
                    const value = data.intersectionMatrix[i][j];
                    const color = getColor(value);
                    const textColor = getContrastColor(color);

                    const cellGroup = g.append("g");

                    cellGroup.append("rect")
                        .attr("x", (j - 1) * cellWidth)
                        .attr("y", i * cellHeight)
                        .attr("width", cellWidth)
                        .attr("height", cellHeight)
                        .attr("fill", color)
                        .attr("stroke", "white");

                    cellGroup.append("text")
                        .attr("x", (j - 1) * cellWidth + cellWidth / 2)
                        .attr("y", i * cellHeight + cellHeight / 2)
                        .attr("text-anchor", "middle")
                        .attr("dy", "0.35em")
                        .attr("fill", textColor)
                        .style("font-weight", "bold")
                        .text(value);

                    if (useTooltips) {
                        const showTooltip = (event: MouseEvent) => {
                            tooltip
                                ?.style("visibility", "visible")
                                .html(`
                                    Min: ${data.axisValues[i]}<br>
                                    Max: ${data.axisValues[j]}<br>
                                    Value: ${value}
                                `)
                                .style("left", `${event.pageX + 10}px`)
                                .style("top", `${event.pageY - 10}px`);
                        };

                        const hideTooltip = () => {
                            tooltip?.style("visibility", "hidden");
                            removeHighlight();
                        };

                        cellGroup
                            .on("mouseover", (event: MouseEvent) => {
                                showTooltip(event);
                                highlightRowAndColumn(i, j - 1);
                            })
                            .on("mouseout", hideTooltip)
                            .on("mousemove", showTooltip);
                    }
                }
            }
        }
    }

    function cleanup() {
        svg?.remove();
        tooltip?.remove();
    }

    onMount(redraw);
    onDestroy(cleanup);
</script>

<div bind:this={chartContainer} class="w-full h-full"></div>