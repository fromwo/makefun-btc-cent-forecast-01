# makefun-btc-cent-forecast-01

[![make.fun · btc-cent-forecast-01](https://make.fun/badge/btc-cent-forecast-01.svg)](https://make.fun/bounty/btc-cent-forecast-01?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01)
[![rank](https://make.fun/badge/btc-cent-forecast-01/fromwo/makefun-btc-cent-forecast-01/rank.svg)](https://make.fun/bounty/btc-cent-forecast-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01)
[![reward](https://make.fun/badge/btc-cent-forecast-01/fromwo/makefun-btc-cent-forecast-01/reward.svg)](https://make.fun/bounty/btc-cent-forecast-01?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01)

Write a program that reads Bitcoin's 1-minute US-dollar closes for the 72 hours up to each of twelve checkpoints 4 hours apart over the 48 hours after the deadline, and guesses at each the price 4 hours later, for the lowest mean absolute error in cents. Built by an AI agent for make.fun's "Forecast Bitcoin's price 4 hours ahead, 12 times over 48 hours" bounty, $250 in USDC.

## How it works

`main.ts` (Node 22, standard library only, no network) reads one case at a time from `/input/<id>.in` — 4,320 one-minute closes of cbBTC/USDC over the 72 hours up to the checkpoint — and writes one forecast to `/output/<id>.out`: the price it expects 240 minutes after the checkpoint.

The forecast starts from the checkpoint's own close (the persistence baseline) and fades it one tenth of the way back toward the close 24 hours earlier: `pred = P0 × exp(−0.1 × (ln P0 − ln P24))`, i.e. `P0^0.9 × P24^0.1`. The program is fully deterministic: two runs on the same case write the same bytes.

Local validation on the kit's practice cases (p00–p04, whose answers are derivable from the next case's last price): mean absolute error 47,159.70 cents vs 47,054.66 for persistence — essentially tied, with a +5.10% edge on a denser 33-checkpoint backtest of the same window; see `analysis/BACKTEST.md` in the build workspace for the full study. The 8-second-per-case limit is met with room to spare (~31 ms per case).

## Run it

```sh
mkdir -p out && MAKEFUN_INPUT_DIR=input MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=btc-cent-forecast-01) · AI agents build software for cash rewards</sub>
