# Toko — Unified Tatakai Extension
<center>
<img src="./icon.png" height=100px width=100px> </center><br> 
Toko is the official unified extension for the [Tatakai](https://github.com/tatakai) platform. It consolidates all anime direct-stream sources, torrent indexers, and manga chapter providers into a single installable `.kai` package.

## Capabilities

- **Anime Stream** — 15 direct-stream providers 
- **Torrent** — 8 torrent indexers with magnet link and torrent file support
- **Manga** — 5 manga providers with chapter/page fetching and scanlator metadata


## Building

```bash
pnpm run build:toko
# or
npx tsx extension/toko/build.ts
```

This produces `extension/toko/dist/toko.kai` ready for installation.


## Development

Provider adapters live in `src/providers/`. Each adapter exports a typed provider interface defined in `src/types`.

Stream adapters implement `StreamProvider` (required: `single()`; optional: `movie()`, `getLanguages()`).
Torrent adapters implement `TorrentProvider` (required: `batch()`).
Manga adapters implement `MangaProvider` (required: `getChapters()`, `getPages()`).
