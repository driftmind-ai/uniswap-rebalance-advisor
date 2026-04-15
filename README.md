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

## Judge Review Order

Start review from the current release evidence pack:

1. `artifacts/review-pack/latest.json`
2. `index.json`
3. `review-note.md`
4. `hero-decision.json`
5. `planner-step.json`
6. `recorded-tx-note.json`
7. `video-prompt-output.json`
8. `video-planner-output.json`

Items `4` and `5` are the bounded canonical `5 USDC` release contract. Items
`6` through `8` are recorded on-camera evidence for the separate `3 USDC` video
variant on the same hero pair.

Current release proof is intentionally bounded:

- prepared handoff only
- explicit operator-confirmed final step
- one explorer-backed live demo tx on the hero pair
- one recorded video prompt-output variant on the hero pair
- one recorded planner-output follow-up for that video variant

It does not claim autonomous execution by this repo.

## 1. Operator Boundary

Current public/release-safe boundary:

- chain: `X Layer`
- fixed hero pair: `USDC -> WOKB`
- expected hero trade: `5 USDC`
- autochain status for the hero path: `prepared`
- final swap step: `operator-confirmed`
- current operator-confirmed live demo tx on the hero pair:
  [`0x19acc4267e0954101d18399329023e357508813845944e95e94863d83c0f4929`](https://web3.okx.com/explorer/x-layer/tx/0x19acc4267e0954101d18399329023e357508813845944e95e94863d83c0f4929)
  The linked OKX explorer page shows `Accepted on L2`.
- recorded video prompt-output variant on the same hero pair:
  `USDC 10`, `WOKB 0`, target `70 / 30`, drift `1`, min trade `1`
  which produced a `3 USDC` prepared handoff
- recorded planner follow-up on the same video variant:
  a confirm-ready Uniswap URL returned by `uniswap-swap-planner` for `3 USDC`

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

- Submission wallet: [`0x9c5F3f9C728248e18fa8941Bd2788a9dBE064975`](https://web3.okx.com/explorer/x-layer/address/0x9c5F3f9C728248e18fa8941Bd2788a9dBE064975)
- Deployment status: `N/A` for this version

This repo is a decision-and-routing skill. It does not deploy a dedicated
contract in the current release bundle.

## 5. Demo Commands

```powershell
pnpm typecheck
pnpm test
pnpm demo
```

Verification at the time of this release:

- `pnpm typecheck`: clean
- `pnpm build`: clean
- `pnpm test`: 12 vitest tests pass across advisor decisions, planner-bridge
  handoff, and release-package integrity checks

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

## 7. Demo Output Shape

`pnpm demo` prints the hero case plus the `hold` and `blocked` appendix cases.
A shortened hero excerpt looks like:

```json
{
  "heroDemo": {
    "advice": {
      "decision": "rebalance",
      "recommendation": {
        "sellSymbol": "USDC",
        "buySymbol": "WOKB",
        "tradeUsd": 5
      },
      "executionPlan": {
        "nextSkill": "uniswap-swap-planner"
      }
    },
    "autochain": {
      "status": "prepared",
      "chain": "xlayer",
      "plannerUrl": "https://app.uniswap.org/swap?chain=xlayer&inputCurrency=0x74b7f16337b8972027f6196a17a631ac6de26d22&outputCurrency=0xe538905cf8410324e03a5a23c1c177a474d59b2b&value=5&field=INPUT",
      "plannerHandoff": {
        "skill": "uniswap-swap-planner",
        "stopCondition": "before_execution"
      },
      "operatorAction": "confirm_swap"
    }
  }
}
```

## 8. Files

The `src/` folder stays small on purpose: `index.ts` holds the rebalance
decision engine, `planner-bridge.ts` builds the prepared Uniswap handoff, and
`demo.ts` prints the bounded release cases. The other three files are Vitest
suites for the advisor, the bridge, and the release package.

## 9. Prompt Path

Primary prompt:

```text
Use uniswap-rebalance-advisor for this portfolio on X Layer: USDC 10, WOKB 0, target 50/50, drift 5, min trade 5. Return only decision, recommendation, autochain. Stop after the prepared handoff.
```

Short follow-up:

```text
Continue with the planner handoff now and stop at the confirm-ready Uniswap URL.
```

## 10. Proof Status

Evidence currently carried by the release bundle:

- release review entrypoint:
  `artifacts/review-pack/latest.json`
- install/activation artifact:
  `2026-04-14` via
  `npx skills add uniswap/uniswap-ai --skill swap-planner --agent '*' -y`
- current hero contract:
  only `X Layer + USDC -> WOKB` is prepared as the concrete first-pass handoff
- current execution boundary:
  the repo prepares the handoff and the operator confirms the final swap
- current live-demo artifact status:
  operator-confirmed X Layer demo tx:
  [`0x19acc4267e0954101d18399329023e357508813845944e95e94863d83c0f4929`](https://web3.okx.com/explorer/x-layer/tx/0x19acc4267e0954101d18399329023e357508813845944e95e94863d83c0f4929)
  The linked explorer page shows `Accepted on L2`.
  This tx matches the recorded video prompt variant:
  `USDC 10`, `WOKB 0`, target `70 / 30`, drift `1`, min trade `1`, which
  prepared a `3 USDC` handoff on the same hero pair.
  The bounded release contract still remains the `5 USDC` prepared handoff
  shown by `pnpm demo`.
- current video prompt-output artifact:
  `artifacts/review-pack/2026-04-15-xlayer-usdc-wokb-hero-review/video-prompt-output.json`
- current video planner-output artifact:
  `artifacts/review-pack/2026-04-15-xlayer-usdc-wokb-hero-review/video-planner-output.json`
  It records the confirm-ready Uniswap URL returned after the follow-up planner
  step for the `3 USDC` video variant.

Still intentionally unproved in this pass:

- autonomous execution
- generic pair support
- repeatable live proof beyond the recorded hero path
- official planner output artifact for the bounded `5 USDC` release contract

## 11. Team Info

- Team: `Kleggy`
- Contact email: `kleggy00@gmail.com`
- Telegram: [@kleggy00](https://t.me/kleggy00)
- Public repo: [driftmind-ai/uniswap-rebalance-advisor](https://github.com/driftmind-ai/uniswap-rebalance-advisor)
- Demo video: [YouTube demo](https://youtu.be/S8IzWT1JQSE)
- X post: [advisor_aii on X](https://x.com/advisor_aii/status/2044353197402386664)

## 12. Why It Matters On X Layer

Blind execution is easy to oversell. This repo does something narrower and more
useful for operator workflows on X Layer:

- read drift before execution
- stop cleanly when constraints block a safe path
- prepare one concrete handoff when a rebalance is justified

That keeps the current submission honest: one decision layer, one hero path,
one prepared handoff, one operator-confirmed final step.
