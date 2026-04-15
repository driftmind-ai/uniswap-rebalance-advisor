---
name: uniswap-rebalance-advisor
description: "Decide whether a portfolio should hold, rebalance, or stop as blocked, then prepare a concrete Uniswap planner handoff for the fixed X Layer USDC -> WOKB hero path"
version: "1.0.0"
author: "Kleggy"
tags:
  - uniswap
  - rebalance
  - xlayer
  - portfolio
---

# Uniswap Rebalance Advisor

## Workflow

1. Inspect current holdings and target allocation.
2. Compute current weights and drift.
3. Return one decision:
   - `hold`
   - `rebalance`
   - `blocked`
4. If `rebalance` and the result matches the first-pass hero path, prepare:
   - primary sell symbol
   - primary buy symbol
   - `tradeUsd`
   - a concrete Uniswap planner handoff URL
   - a ready-to-use downstream prompt for `uniswap-swap-planner`
   - `operatorAction = confirm_swap`
5. If the result falls outside the first-pass hero path, return `unsupported_pair` at the autochain layer.
6. If constraints block the safe pair, return `blocked` and explain why.

## Routing Rules

- Fixed first-pass hero chain: `X Layer`
- Fixed first-pass hero pair: `USDC -> WOKB`
- Hero holdings example: `USDC 10`, `WOKB 0`, target `50 / 50`
- The semi-auto chain contract exposes a downstream planner prompt, not an autonomous runtime invocation
- Do not claim that this skill signs or executes a live swap autonomously.
