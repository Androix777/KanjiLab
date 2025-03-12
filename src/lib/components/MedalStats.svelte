<script lang="ts">
    import { onMount } from 'svelte';
    
    export type MedalThreshold = {
        value: number;
        color: string;
        points: number;
    };
    
    export type HeatmapData = {
        axisValues: number[];
        intersectionMatrix: number[][];
    };
    
    type MedalStats = {
        counts: Record<number, number>;
        totalPoints: number;
        maxPossiblePoints: number;
    };
    
    const { 
        data,
        thresholds = []
    }: {
        data: HeatmapData;
        thresholds: MedalThreshold[];
    } = $props();
    
    let stats: MedalStats = $state(calculateStats());
    
    function calculateStats(): MedalStats {
        const counts: Record<number, number> = {};
        thresholds.forEach(threshold => {
            counts[threshold.value] = 0;
        });
        
        let totalPoints = 0;
        let totalCells = 0;
        
        for (let i = 0; i < data.axisValues.length - 1; i++) {
            for (let j = 1; j < data.axisValues.length; j++) {
                if (data.axisValues[i] < data.axisValues[j]) {
                    totalCells++;
                    const value = data.intersectionMatrix[i][j];
                    
                    for (const threshold of thresholds) {
                        if (value >= threshold.value) {
                            counts[threshold.value]++;
                            totalPoints += threshold.points;
                        }
                    }
                }
            }
        }
        
        const maxPointsPerCell = thresholds.reduce((sum, threshold) => sum + threshold.points, 0);
        const maxPossiblePoints = totalCells * maxPointsPerCell;
        
        return { counts, totalPoints, maxPossiblePoints };
    }
    
    export function redraw() {
        stats = calculateStats();
    }
    
    onMount(() => {
        redraw();
    });
</script>

<div class="w-full p-4 bg-base-200 rounded-lg shadow">
    <div class="text-center mb-6">
        <h2 class="text-xl font-bold mb-1">Medal Statistics</h2>
        <div class="text-4xl font-bold">{stats.totalPoints} <span class="text-xl opacity-70">/ {stats.maxPossiblePoints}</span></div>
        <div class="text-base opacity-80">Total Points</div>
    </div>
    
    <div class="mb-6">
        <div class="w-full bg-base-300 rounded-full h-4 overflow-hidden">
            <div 
                class="h-4 rounded-full bg-primary" 
                style="width: {Math.min(100, (stats.totalPoints / stats.maxPossiblePoints) * 100)}%"
            ></div>
        </div>
        <div class="flex justify-end text-sm mt-1">
            <span>{Math.floor((stats.totalPoints / stats.maxPossiblePoints) * 100)}% complete</span>
        </div>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {#each thresholds.filter(t => t.points > 0) as threshold}
            <div class="flex items-center p-3 rounded-lg" style="background-color: {threshold.color}20;">
                <div class="w-12 h-12 rounded-full flex items-center justify-center mr-3" 
                     style="background-color: {threshold.color};">
                    <span class="font-bold" style="color: black;">
                        {threshold.value}+
                    </span>
                </div>
                <div>
                    <div class="font-semibold" style="color: {threshold.color};">{stats.counts[threshold.value]} medals</div>
                    <div class="text-sm font-medium" style="color: {threshold.color};">{threshold.points} points each</div>
                </div>
            </div>
        {/each}
    </div>
</div>
