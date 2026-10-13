# README visuals

[Back to the project](../../README.md)

`overview.svg` is an original explanatory workflow illustration, not a product screenshot.

`demo.png`: A screenshot of the actual graph report generated from the included repository fixture. The forbidden import is intentional.

The demo uses synthetic local data; it does not represent a production deployment or a live model evaluation.

## Reproduce the data

Run from the repository root after following the main README installation steps:

```bash
demo_root="$(mktemp -d)"
node dist/cli.js demo > "$demo_root/result.json" # expected exit 1
node dist/cli.js report "$demo_root/result.json" "$demo_root/report.html"
```

Timing values and generated paths may differ between runs. Screenshots show the relevant report view; complete artifacts stay in your selected output directory.
