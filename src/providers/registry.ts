/**
 * Central provider registry for the Toko extension.
 * Import provider lists from here to keep index.ts focused on runtime logic.
 */
import type { StreamProvider, TorrentProvider, MangaProvider } from '../types/index.js';

// ── Stream providers ──────────────────────────────────────────────────────────
import animepahe from './stream/animepahe.js';
import animeya from './stream/animeya.js';
import toonstream from './stream/toonstream.js';
import animelok from './stream/animelok.js';
import watchanimeworld from './stream/watchanimeworld.js';
import aniworld from './stream/aniworld.js';
import senshi from './stream/senshi.js';
import reanime from './stream/reanime.js';
import fouranime from './stream/fouranime.js';
import anikoto from './stream/anikoto.js';
import animeheaven from './stream/animeheaven.js';
import anizone from './stream/anizone.js';
import animesalt from './stream/animesalt.js';
import animeblkom from './stream/animeblkom.js';

export const STREAM_PROVIDERS: StreamProvider[] = [
  animepahe,
  animeya,
  toonstream,
  animelok,
  watchanimeworld,
  aniworld,
  senshi,
  reanime,
  fouranime,
  anikoto,
  animeheaven,
  anizone,
  animesalt,
  animeblkom,
];

// ── Torrent providers ─────────────────────────────────────────────────────────
import nyaa from './torrent/nyaa.js';
import acgrip from './torrent/acgrip.js';
import animetosho from './torrent/animetosho.js';
import subplease from './torrent/subplease.js';
import seadex from './torrent/seadex.js';
import nekobt from './torrent/nekobt.js';
export const TORRENT_PROVIDERS: TorrentProvider[] = [
  nyaa,
  acgrip,
  animetosho,
  subplease,
  seadex,
  nekobt,
];

// ── Manga providers ───────────────────────────────────────────────────────────
import allmanga from './manga/allmanga.js';
import atsu from './manga/atsu.js';
import mangafire from './manga/mangafire.js';
import animesama from './manga/animesama.js';
import asura from './manga/asura.js';

export const MANGA_PROVIDERS: MangaProvider[] = [
  allmanga,
  atsu,
  mangafire,
  animesama,
  asura,
];
