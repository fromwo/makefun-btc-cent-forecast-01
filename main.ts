// btc-cent-forecast-01 entry (Node 22, standard library only, no network).
//
// Forecast: a small, shrunk 24-hour mean-reversion ("fade") on top of the persistence
// baseline. From the case's 4,320 one-minute closes (72 h up to the checkpoint):
//
//   pred = P0 * exp(-0.1 * (ln P0 - ln P24))
//
// where P0 is the checkpoint close (prices[-1]) and P24 is the close 1,440 minutes
// (24 h) earlier (prices[-1441]). Equivalently pred = P0^0.9 * P24^0.1: the guess
// moves one tenth of the way back from today's close toward yesterday's close.
//
// Why this shape (backtested on the kit's practice cases, see
// ~/workspace/makefun/btc-cent-forecast-01/analysis/BACKTEST.md):
//  - On 33 half-hourly checkpoints cut from the practice window, this scores a mean
//    absolute error of 47,604 cents vs 50,162 for persistence (+5.10%), with the best
//    paired t (+1.48) and the best win rate (0.61) of all 79 candidates tried, winning
//    in both halves of the window; on the five practice cases whose answers are
//    derivable locally (p00-p04) it scores 47,160 vs persistence's 47,055 (-0.22%,
//    essentially tied). The stronger k = -0.2 variant wins more on the 33-point set
//    (+6.99%) but loses more on the five practice cases (-0.45%) and doubles the
//    downside if the final 48 h trend instead of reverting, so k = -0.1 is the
//    risk-adjusted choice. Local validation of this file (validate-local.mjs, run
//    twice): p00-p04 MAE 47,159.7040 cents vs persistence 47,054.6616, byte-identical
//    outputs across runs, ~31 ms per case (limit 8,000 ms); per-case errors
//    28,195.50 / 74,423.33 / 56,903.35 / 41,573.20 / 34,703.14 cents.
//  - Momentum (positive k) extrapolation lost everywhere in the backtest, the worse
//    the larger k was, so no trend term is used at all.
//  - The adjustment is bounded: |adjustment| = 0.1 * |24 h log return|, typically
//    under 0.3% of the price, so even if the final regime is a trend market the
//    extra loss vs persistence stays small.
//  - Only two prices are used, no fitting at run time, no randomness, no clock:
//    two runs on the same case write the same bytes.
//
// Contract (same as the kit's starter): read every <id>.in in the input directory
// ($MAKEFUN_INPUT_DIR, else /input), write <id>.out to the output directory
// ($MAKEFUN_OUTPUT_DIR, else /output) as {"forecasts":[{"case":"<id>","price":n}]},
// price a finite number in (0, 10,000,000) on the grid's 5 decimals.
// Local run: mkdir -p out && MAKEFUN_INPUT_DIR=input MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** The smallest positive price on the grid: one unit of its 5 decimals. */
const MIN_PRICE = 0.00001;
/** The largest grid price below the scorer's exclusive 10,000,000-dollar cap. */
const MAX_PRICE = 9_999_999.99999;
/** Minutes in the lookback: the close 24 h before the checkpoint. */
const LOOKBACK_MINUTES = 1440;
/** Fade strength: the fraction of the 24 h log move that is reversed. */
const FADE = 0.1;

interface CaseMarket {
  id: string;
  prices: number[];
}

interface Case {
  markets: CaseMarket[];
}

/** x kept on the grid's 5 decimals and inside the scorer's (0, 10,000,000). */
const price5 = (x: number): number => Math.round(Math.min(MAX_PRICE, Math.max(MIN_PRICE, x)) * 1e5) / 1e5;

/**
 * The forecast for one market: the checkpoint close faded one tenth of the way
 * back toward the close 24 h earlier. With fewer than LOOKBACK_MINUTES + 1 prices
 * (never in a real case, which holds 4,320), the earliest price stands in for it.
 */
function forecast(m: CaseMarket): number {
  if (!Array.isArray(m.prices) || m.prices.length === 0) throw new Error(`market ${m.id} has no prices`);
  const p0 = m.prices[m.prices.length - 1] as number;
  if (typeof p0 !== 'number' || !Number.isFinite(p0) || p0 <= 0) {
    throw new Error(`market ${m.id}'s last price is not a finite positive number`);
  }
  const idx = m.prices.length - 1 - LOOKBACK_MINUTES;
  const p24 = m.prices[idx >= 0 ? idx : 0] as number;
  if (typeof p24 !== 'number' || !Number.isFinite(p24) || p24 <= 0) {
    throw new Error(`market ${m.id}'s 24 h-ago price is not a finite positive number`);
  }
  return price5(p0 * Math.exp(-FADE * (Math.log(p0) - Math.log(p24))));
}

mkdirSync(OUTPUT_DIR, { recursive: true });
// Every case file, in name order, so two runs write the same bytes.
const inputs = readdirSync(INPUT_DIR).filter((f) => f.endsWith('.in')).sort();
for (const file of inputs) {
  const id = file.slice(0, -'.in'.length);
  const c = JSON.parse(readFileSync(join(INPUT_DIR, file), 'utf8')) as Case;
  if (!Array.isArray(c.markets) || c.markets.length !== 1) throw new Error(`${file} does not hold exactly one market`);
  writeFileSync(join(OUTPUT_DIR, `${id}.out`), `${JSON.stringify({ forecasts: [{ case: id, price: forecast(c.markets[0] as CaseMarket) }] })}\n`);
}
