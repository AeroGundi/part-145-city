# Part-145 City

**The visual map of EASA Part-145.** A maintenance organisation drawn as a miniature airport/MRO city, where every
requirement of Annex II (Part-145) has a place — and the official text, AMC and GM are one keystroke away.

Understand → locate → remember → apply. It is a spatial reference tool, not a game.

```bash
npm install
npm run dev        # http://localhost:5183
npm test           # content-integrity and layout tests
npm run build      # static site in dist/
npm run ingest     # rebuild the dataset from sources/*.xml + sources/amendments/* (pass another path to ingest a newer EASA export)
```

- `Cmd/Ctrl + K` search · `E` Explore · `R` Reference · `F` Find · arrows / `+ −` / `[ ]` / `0` move the camera
- Deep links: `/part-145/145.A.45`, `/part-145/145.A.45/amc/1`, `/part-145/145.A.55(d)(1)(i)`, `/part-145/appendix-i`, `/place/stores`

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing anything: it explains what is official text, what is
editorial, and the known regulatory gaps of the current dataset.

> Always verify the applicable current official regulatory text before making compliance decisions.
