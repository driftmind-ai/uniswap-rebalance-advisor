# Uniswap Rebalance Advisor

`uniswap-rebalance-advisor` is a decision-and-routing skill for X Layer
portfolios. The current release bundle is intentionally narrow:

- one hero chain: `X Layer`
- one hero pair: `USDC -> WOKB`
- one expected hero trade: `5 USDC`
- one prepared handoff to `uniswap-swap-planner`
- one operator-confirmed final step

The repo answers a pre-execution question first: should this portfolio
`hold`, `rebalance`, or stop as `blocked`?

## 1. Operator Boundary

Current public/release-safe boundary:

- chain: `X Layer`
- fixed hero pair: `USDC -> WOKB`
- expected hero trade: `5 USDC`
- autochain status for the hero path: `prepared`
- final swap step: `operator-confirmed`
- current live tx artifact:
  `0x19acc4267e0954101d18399329023e357508813845944e95e94863d83c0f4929`

Not claimed in this release bundle:

- autonomous swap execution
- generic multi-pair routing
- onchain settlement performed by this repo itself

## 2. Architecture Overview

This repo sits before execution.

- Input: holdings, target allocation, drift threshold, and optional routing
  constraints
- Analysis: compute current weights and measure portfolio drift
- Decision: return exactly one state: `hold`, `rebalance`, or `blocked`
- Handoff: when the result matches the fixed hero path, emit one prepared
  planner package for the next step

Prepared handoff fields for the hero path:

- `recommendation.sellSymbol`
- `recommendation.buySymbol`
- `recommendation.tradeUsd`
- `autochain.status = "prepared"`
- `autochain.plannerHandoff.skill = "uniswap-swap-planner"`
- `autochain.operatorAction = "confirm_swap"`
- `autochain.plannerUrl`

If constraints make the route unsafe, the repo returns `blocked` with explicit
warnings instead of forcing a trade.

## 3. Official Uniswap Skill Usage

Official module used in the current story:

- `uniswap-swap-planner`

Install path used in proof notes:

```bash
npx skills add uniswap/uniswap-ai --skill swap-planner --agent '*' -y
```

What this repo does with official Uniswap tooling:

- prepares one concrete planner handoff for `X Layer + USDC -> WOKB`
- prepares one downstream prompt for the planner step
- prepares one confirm-ready Uniswap URL for the operator

What this repo does not do:

- sign the swap
- invoke the final runtime execution autonomously
- claim support for arbitrary token pairs in the current release pass

## 4. Agentic Wallet And Deployment Status

- Submission wallet: `0x9c5F3f9C728248e18fa8941Bd2788a9dBE064975`
- Deployment status: `N/A` for this version

This repo is a decision-and-routing skill. It does not deploy a dedicated
contract in the current release bundle.

## 5. Demo Commands

```powershell
pnpm typecheck
pnpm test
pnpm demo
```

The demo prints three bounded cases:

- `heroDemo`: `rebalance` with a prepared handoff for `USDC -> WOKB`
- `appendix.hold`: no-action path
- `appendix.blocked`: stop-safe path with warnings

## 6. Example Hero Output

The current hero path returns:

- `decision = "rebalance"`
- `recommendation.sellSymbol = "USDC"`
- `recommendation.buySymbol = "WOKB"`
- `recommendation.tradeUsd = 5`
- `autochain.status = "prepared"`
- `autochain.plannerHandoff.skill = "uniswap-swap-planner"`
- `autochain.operatorAction = "confirm_swap"`
- `autochain.plannerUrl` as the next operator-opened Uniswap URL

## 7. Prompt Path

Primary prompt:

```text
Use uniswap-rebalance-advisor for this portfolio on X Layer: USDC 10, WOKB 0, target 50/50, drift 5, min trade 5. Return only decision, recommendation, autochain, plannerHandoff. Stop after the prepared handoff.
```

Short follow-up:

```text
Continue with the planner handoff now and stop at the confirm-ready Uniswap URL.
```

## 8. Proof Status

Evidence currently carried by the release bundle:

- install/activation artifact:
  `2026-04-14` via
  `npx skills add uniswap/uniswap-ai --skill swap-planner --agent '*' -y`
- current hero contract:
  only `X Layer + USDC -> WOKB` is prepared as the concrete first-pass handoff
- current execution boundary:
  the repo prepares the handoff and the operator confirms the final swap
- current live-demo artifact status:
  X Layer tx hash:
  `0x19acc4267e0954101d18399329023e357508813845944e95e94863d83c0f4929`

Still intentionally unproved in this pass:

- autonomous execution
- generic pair support
- repeatable live proof beyond the recorded hero path

## 9. Team Info

- Team: `Kleggy`
- Contact email: `kleggy00@gmail.com`
- Public repo: `https://github.com/driftmind-ai/uniswap-rebalance-advisor`
- Demo video: `https://youtu.be/S8IzWT1JQSE`
- X post: `https://x.com/advisor_aii/status/2044353197402386664`

## 10. Why It Matters On X Layer

Blind execution is easy to oversell. This repo does something narrower and more
useful for operator workflows on X Layer:

- read drift before execution
- stop cleanly when constraints block a safe path
- prepare one concrete handoff when a rebalance is justified

That keeps the current submission honest: one decision layer, one hero path,
one prepared handoff, one operator-confirmed final step.
