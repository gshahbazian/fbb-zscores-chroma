# zscores

```bash
bun install
```

Run chroma server:

```bash
chroma run
```

Insert data locally:

```bash
bun scripts/scrape.ts
bun scripts/calc-scores.ts
bun scripts/insert-vectors.ts
```

Test query:

```bash
bun scripts/find-similar.ts "Austin Reaves"
```

Start web app:

```bash
bun dev
```
