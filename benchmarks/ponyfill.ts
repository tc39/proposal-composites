import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { Composite } from "../polyfill/index.ts";

const SAMPLE_COUNT = 7;
const SAMPLE_TIME_MS = 120;
const WARMUP_TIME_MS = 100;

type Benchmark = {
    name: string;
    operation: () => void;
};

type Result = {
    name: string;
    iterations: number;
    medianOpsPerSecond: number;
    minOpsPerSecond: number;
    maxOpsPerSecond: number;
};

let sink: unknown;
const small = { x: 1, y: 2 };
const wide = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`key${i.toString().padStart(2, "0")}`, i]));
const nested = Composite({ child: Composite({ x: 1, y: 2 }), tag: "point" });
const nestedInput = { child: Composite({ x: 1, y: 2 }), tag: "point" };
const longStringInput = { value: "x".repeat(16 * 1024) };

let unique = 0;
const benchmarks: Benchmark[] = [
    { name: "Composite cache hit (2 keys)", operation: () => void (sink = Composite(small)) },
    { name: "Composite cache hit (20 keys)", operation: () => void (sink = Composite(wide)) },
    { name: "Composite nested cache hit", operation: () => void (sink = Composite(nestedInput)) },
    { name: "Composite cache miss (unique number)", operation: () => void (sink = Composite({ value: unique++ })) },
    { name: "Composite cache hit (16 KiB string)", operation: () => void (sink = Composite(longStringInput)) },
];

function runFor(operation: () => void, iterations: number): number {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) operation();
    return performance.now() - start;
}

function calibrate(operation: () => void): number {
    let iterations = 1;
    while (iterations < 2 ** 30) {
        const duration = runFor(operation, iterations);
        if (duration >= WARMUP_TIME_MS) {
            return Math.max(1, Math.round((iterations * SAMPLE_TIME_MS) / duration));
        }
        iterations *= 2;
    }
    return iterations;
}

function median(values: number[]): number {
    const sorted = values.toSorted((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

function benchmark({ name, operation }: Benchmark): Result {
    const iterations = calibrate(operation);
    runFor(operation, iterations);
    const samples = Array.from({ length: SAMPLE_COUNT }, () => {
        const duration = runFor(operation, iterations);
        return (iterations * 1000) / duration;
    });
    return {
        name,
        iterations,
        medianOpsPerSecond: median(samples),
        minOpsPerSecond: Math.min(...samples),
        maxOpsPerSecond: Math.max(...samples),
    };
}

const results = benchmarks.map(benchmark);
const compareIndex = process.argv.indexOf("--compare");
if (compareIndex !== -1) {
    const baselinePath = process.argv[compareIndex + 1];
    if (baselinePath === undefined) throw new TypeError("--compare requires a baseline JSON path");
    const baseline = JSON.parse(readFileSync(baselinePath, "utf8")) as { results: Result[] };
    const baselineByName = new Map(baseline.results.map((result) => [result.name, result]));
    console.table(
        results.map(({ name, medianOpsPerSecond }) => {
            const baselineOpsPerSecond = baselineByName.get(name)?.medianOpsPerSecond;
            return {
                benchmark: name,
                "baseline ops/s": baselineOpsPerSecond && Math.round(baselineOpsPerSecond).toLocaleString("en-US"),
                "current ops/s": Math.round(medianOpsPerSecond).toLocaleString("en-US"),
                change:
                    baselineOpsPerSecond && `${((medianOpsPerSecond / baselineOpsPerSecond - 1) * 100).toFixed(1)}%`,
            };
        }),
    );
} else if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ node: process.version, results }, null, 2));
} else {
    console.table(
        results.map(({ name, medianOpsPerSecond, minOpsPerSecond, maxOpsPerSecond }) => ({
            benchmark: name,
            "median ops/s": Math.round(medianOpsPerSecond).toLocaleString("en-US"),
            "min ops/s": Math.round(minOpsPerSecond).toLocaleString("en-US"),
            "max ops/s": Math.round(maxOpsPerSecond).toLocaleString("en-US"),
        })),
    );
}

// Keep benchmark results observable to the optimizer.
void sink;
