---
name: uniswap-rebalance-advisor
description: "Use when an agent needs a bounded rebalance decision before opening Uniswap on X Layer for the current release hero path"
version: "1.0.0"
author: "Kleggy"
tags:
  - uniswap
  - rebalance
  - xlayer
  - portfolio
---

# Uniswap Rebalance Advisor

## Overview

Bounded decision layer for X Layer portfolio rebalancing. It returns
`hold`, `rebalance`, or `blocked`, and for the supported hero path it prepares
an `uniswap-swap-planner` handoff instead of executing the swap.

## When to Use

- need a pre-trade rebalance decision for an X Layer portfolio
- need one stablecoin-input rebalance sized before opening Uniswap
- need a safe stop state when constraints block the route
- need a confirm-ready planner handoff, not autonomous execution

## Quick Reference

- Inputs:
  - holdings with `symbol`, `valueUsd`, and `targetPercent`
  - `driftThresholdPercent`
  - optional routing constraints
- Outputs:
  - `hold`
  - `rebalance`
  - `blocked`
- Prepared handoff fields on the supported path:
  - `tradeUsd`
  - `plannerUrl`
  - `plannerHandoff`
  - `operatorAction = confirm_swap`

## Supported Path

- verified hero path:
  - `X Layer + USDC -> WOKB`
- hero example:
  - `USDC 10`, `WOKB 0`, target `50 / 50`
- downstream planner skill:
  - `uniswap-swap-planner`

## Proof Boundary

- treat the current release as a prepared handoff plus an operator-confirmed
  final step
- do not describe this repo as an autonomous swap executor
- do not generalize beyond the current `X Layer + USDC -> WOKB` hero path

## Do Not Use For

- generic multi-pair routing
- reverse routing such as `WOKB -> USDC`
- autonomous execution or signing
- non-stablecoin input amount conversion
