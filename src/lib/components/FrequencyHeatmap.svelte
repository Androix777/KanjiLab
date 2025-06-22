<script lang="ts">
	import * as d3 from 'd3';
	import { onDestroy, onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import type { AnswerStreaks } from '$lib/types';

	const BASE_CONTENT = `oklch(var(--bc))`;
	const AXIS_LABEL_COLOR = `oklch(var(--bc) / 0.7)`;

	export type HeatmapData = {
		axisValues: number[];
		intersectionMatrix: number[][];
		streaksData?: (AnswerStreaks[] | null)[][];
	};

	type Threshold = {
		value: number;
		color: string;
	};

	type TooltipInfo = {
		min: string | number;
		max: string | number;
		value: number;
		streaks: AnswerStreaks[] | null;
	};

	type Props = {
		data: HeatmapData;
		margin?: { top: number; right: number; bottom: number; left: number };
		thresholds?: Threshold[];
		highlightColor?: string;
	};

	const {
		data,
		margin = { top: 60, right: 30, bottom: 30, left: 50 },
		thresholds = [],
		highlightColor = 'oklch(var(--p) / 0.1)'
	}: Props = $props();

	let chartContainer: HTMLDivElement;
	let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = $state(null);

	let tooltipInfo: TooltipInfo | null = $state(null);
	let tooltipPosition = $state({ x: 0, y: 0 });
	
	let highlightRow: d3.Selection<SVGRectElement, unknown, null, undefined> | null = null;
	let highlightColumn: d3.Selection<SVGRectElement, unknown, null, undefined> | null = null;
	
	let hideTooltipTimeout: ReturnType<typeof setTimeout> | null = null;

	function portal(node: HTMLElement) {
		document.body.appendChild(node);

		return {
			destroy() {
				if (document.body.contains(node)) {
					document.body.removeChild(node);
				}
			}
		};
	}


	export function redraw() {
		cleanup();

		const size = Math.min(chartContainer.clientWidth, chartContainer.clientHeight);
		const width = size;
		const height = size;

		if (width <= 0 || height <= 0) return;

		const innerWidth = width - margin.left - margin.right;
		const innerHeight = height - margin.top - margin.bottom;
		const cellWidth = innerWidth / (data.axisValues.length - 1);
		const cellHeight = innerHeight / (data.axisValues.length - 1);
		const cellPadding = 2;

		svg = d3
			.select(chartContainer)
			.append('svg')
			.attr('width', '100%')
			.attr('height', '100%')
			.attr('viewBox', `0 0 ${width} ${height}`);

		const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

		const minCellDimension = Math.min(cellWidth, cellHeight);
		const axisLabelFontSize = Math.max(8, Math.min(32, minCellDimension * 0.25));

		g.append('g')
			.attr('transform', `translate(0,-15)`)
			.selectAll('text')
			.data(data.axisValues.slice(1))
			.enter()
			.append('text')
			.attr('x', (_, i) => i * cellWidth + cellWidth / 2)
			.attr('text-anchor', 'middle')
			.attr('fill', AXIS_LABEL_COLOR)
			.style('font-size', `${axisLabelFontSize}px`)
			.style('font-weight', '500')
			.style('font-family', 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace')
			.text((d) => (d === Infinity ? '∞' : d.toString()));

		g.append('g')
			.attr('transform', `translate(-10,0)`)
			.selectAll('text')
			.data(data.axisValues.slice(0, -1))
			.enter()
			.append('text')
			.attr('x', 0)
			.attr('y', (_, i) => i * cellHeight + cellHeight / 2)
			.attr('transform', (_, i) => `rotate(-90, 0, ${i * cellHeight + cellHeight / 2})`)
			.attr('text-anchor', 'middle')
			.attr('dy', '0.35em')
			.attr('fill', AXIS_LABEL_COLOR)
			.style('font-size', `${axisLabelFontSize}px`)
			.style('font-weight', '500')
			.style('font-family', 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace')
			.text((d) => d.toString());

		const axisTitleFontSize = Math.max(10, Math.min(16, minCellDimension * 0.3));

		g.append('text')
			.attr('x', innerWidth / 2)
			.attr('y', -40)
			.attr('text-anchor', 'middle')
			.attr('fill', BASE_CONTENT)
			.style('font-size', `${axisTitleFontSize}px`)
			.style('font-weight', '600')
			.text('Maximum Value');

		g.append('text')
			.attr('transform', `rotate(-90)`)
			.attr('x', -innerHeight / 2)
			.attr('y', -35)
			.attr('text-anchor', 'middle')
			.attr('fill', BASE_CONTENT)
			.style('font-size', `${axisTitleFontSize}px`)
			.style('font-weight', '600')
			.text('Minimum Value');

		function getColor(value: number): string {
			for (let i = thresholds.length - 1; i >= 0; i--) {
				if (value >= thresholds[i].value) return thresholds[i].color;
			}
			return '#808080';
		}
		function getContrastColor(hex: string): string {
			const r = parseInt(hex.slice(1, 3), 16);
			const g = parseInt(hex.slice(3, 5), 16);
			const b = parseInt(hex.slice(5, 7), 16);
			return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#000000' : '#ffffff';
		}
		function initializeHighlight() {
			highlightRow = g.append('rect')
				.attr('class', 'highlight-row')
				.attr('x', 0)
				.attr('y', -cellHeight)
				.attr('width', innerWidth)
				.attr('height', cellHeight)
				.attr('fill', highlightColor)
				.style('pointer-events', 'none')
				.style('opacity', 0);
			
			highlightColumn = g.append('rect')
				.attr('class', 'highlight-column')
				.attr('x', -cellWidth)
				.attr('y', 0)
				.attr('width', cellWidth)
				.attr('height', innerHeight)
				.attr('fill', highlightColor)
				.style('pointer-events', 'none')
				.style('opacity', 0);
		}

		function animateHighlight(i: number, j: number) {
			if (!highlightRow || !highlightColumn) return;
			
			const duration = 200;
			const ease = d3.easeCubicOut;
			
			highlightRow
				.transition()
				.duration(duration)
				.ease(ease)
				.attr('y', i * cellHeight)
				.style('opacity', 1);
			
			highlightColumn
				.transition()
				.duration(duration)
				.ease(ease)
				.attr('x', j * cellWidth)
				.style('opacity', 1);
		}

		function hideHighlight() {
			if (!highlightRow || !highlightColumn) return;
			
			const duration = 120;
			
			highlightRow
				.transition()
				.duration(duration)
				.style('opacity', 0);
			
			highlightColumn
				.transition()
				.duration(duration)
				.style('opacity', 0);
		}

		for (let i = 0; i < data.axisValues.length - 1; i++) {
			for (let j = 1; j < data.axisValues.length; j++) {
				if (data.axisValues[i] < data.axisValues[j]) {
					const value = data.intersectionMatrix[i][j];
					const color = getColor(value);
					const textColor = getContrastColor(color);
					const cellGroup = g.append('g');

					const hitArea = cellGroup
						.append('rect')
						.attr('x', (j - 1) * cellWidth)
						.attr('y', i * cellHeight)
						.attr('width', cellWidth)
						.attr('height', cellHeight)
						.attr('fill', 'transparent')
						.style('cursor', 'pointer');

					cellGroup
						.append('rect')
						.attr('x', (j - 1) * cellWidth + cellPadding / 2)
						.attr('y', i * cellHeight + cellPadding / 2)
						.attr('width', cellWidth - cellPadding)
						.attr('height', cellHeight - cellPadding)
						.attr('fill', color)
						.attr('rx', 2)
						.attr('ry', 2)
						.style('pointer-events', 'none')
						.style('transition', 'all 0.2s ease');

					const minCellDimension = Math.min(cellWidth, cellHeight);
					const fontSize = Math.max(8, Math.min(32, minCellDimension * 0.4));

					cellGroup
						.append('text')
						.attr('x', (j - 1) * cellWidth + cellWidth / 2)
						.attr('y', i * cellHeight + cellHeight / 2)
						.attr('text-anchor', 'middle')
						.attr('dy', '0.35em')
						.attr('fill', textColor)
						.style('font-weight', '600')
						.style('font-size', `${fontSize}px`)
						.style('font-family', 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif')
						.style('pointer-events', 'none')
						.text(value);

					hitArea
						.on('mouseover', (event: MouseEvent) => {
							if (hideTooltipTimeout) {
								clearTimeout(hideTooltipTimeout);
								hideTooltipTimeout = null;
							}
							
							const streaksForCell = data.streaksData?.[i]?.[j];
							tooltipInfo = {
								min: data.axisValues[i] === Infinity ? '∞' : data.axisValues[i],
								max: data.axisValues[j] === Infinity ? '∞' : data.axisValues[j],
								value: value,
								streaks: streaksForCell && streaksForCell.length > 0 ? streaksForCell : null
							};
							animateHighlight(i, j - 1);
							tooltipPosition = { x: event.pageX + 15, y: event.pageY + 15 };
						})
						.on('mousemove', (event: MouseEvent) => {
							tooltipPosition = { x: event.pageX + 15, y: event.pageY + 15 };
						})
						.on('mouseout', () => {
							hideTooltipTimeout = setTimeout(() => {
								tooltipInfo = null;
								hideHighlight();
								hideTooltipTimeout = null;
							}, 50);
						});
				}
			}
		}

		initializeHighlight();
	}


	function cleanup() {
		svg?.remove();
		svg = null;
		highlightRow = null;
		highlightColumn = null;
		
		if (hideTooltipTimeout) {
			clearTimeout(hideTooltipTimeout);
			hideTooltipTimeout = null;
		}
	}

	let resizeTimeout: ReturnType<typeof setTimeout>;
	function handleResize() {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(() => {
			redraw();
		}, 150);
	}

	onMount(() => {
		redraw();
		window.addEventListener('resize', handleResize);
	});

	onDestroy(() => {
		cleanup();
		window.removeEventListener('resize', handleResize);
	});
</script>

<div bind:this={chartContainer} class="w-full h-full relative overflow-hidden">
</div>

{#if tooltipInfo}
	<div
		use:portal
		in:fly={{ y: 10, duration: 200, easing: quintOut }}
		out:fade={{ duration: 150 }}
		class="fixed p-3 rounded-lg shadow-xl pointer-events-none bg-base-100 text-base-content border border-base-300 z-50"
		style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px; min-width: 180px;"
	>
		<div class="text-center mb-2">
			<div class="text-lg font-mono font-bold text-primary">
				{tooltipInfo.min} — {tooltipInfo.max}
			</div>
		</div>

		<div class="border-t border-base-300 my-2"></div>

		<div>
			<div class="text-sm font-semibold text-base-content mb-1">Top Streaks</div>
			<div class="space-y-0.5">
				{#if tooltipInfo.streaks}
					{#each tooltipInfo.streaks.slice(0, 5) as streak, index}
						<div class="flex justify-between items-center py-0.5 px-2 rounded bg-base-200/50">
							<div class="flex items-center">
								{#if index === 0}
									<span>🥇</span>
								{:else if index === 1}
									<span>🥈</span>
								{:else if index === 2}
									<span>🥉</span>
								{:else}
									<span>🔘</span>
								{/if}
							</div>
							<span class="font-mono font-bold text-lg text-primary">{streak.length}</span>
						</div>
					{/each}
				{:else}
					<div class="flex justify-between items-center py-0.5 px-2 rounded bg-base-200/50">
						<div class="flex items-center">
							<span>🥇</span>
						</div>
						<span class="font-mono font-bold text-lg text-primary">{tooltipInfo.value}</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
