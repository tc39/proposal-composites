# Ponyfill benchmarks

Run the benchmark suite on an otherwise idle machine:

```sh
npm run benchmark
```

To compare a change, save the baseline and pass it back after making the change:

```sh
npm run benchmark -- --json > /tmp/composite-baseline.json
npm run benchmark -- --compare /tmp/composite-baseline.json
```

Each case warms up independently, calibrates toward 120 ms per sample, and reports the median and range of seven
samples. Compare runs with the same Node version and machine. Cache-miss results include allocation, registry growth,
and garbage-collection costs, so their range is normally wider than cache-hit results.
