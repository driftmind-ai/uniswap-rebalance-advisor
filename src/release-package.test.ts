import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createUniswapRebalanceAdvisor } from "./index.js";
import { prepareAutochainDemo } from "./planner-bridge.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(resolve(repoRoot, relativePath), "utf8")
  ) as T;
}

function readText(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

describe("release package", () => {
  it("aligns package exports to the built dist entrypoints", () => {
    const pkg = readJson<{
      exports: { ".": unknown };
    }>("package.json");

    expect(pkg.exports["."]).toEqual({
      types: "./dist/index.d.ts",
      import: "./dist/index.js"
    });
  });

  it("keeps the review-pack hero artifacts in sync with the current hero path", () => {
    const advisor = createUniswapRebalanceAdvisor({
      driftThresholdPercent: 5,
      minTradeUsd: 5
    });
    const advice = advisor.advise({
      holdings: [
        { symbol: "USDC", valueUsd: 10, targetPercent: 50 },
        { symbol: "WOKB", valueUsd: 0, targetPercent: 50 }
      ]
    });
    const heroDemo = prepareAutochainDemo(advice, {
      chain: "xlayer"
    });

    const latest = readJson<{
      reviewId: string;
      evidenceMode: string;
      indexPath: string;
      notePath: string;
      heroDecisionPath: string;
      plannerStepPath: string;
      txNotePath: string;
      videoPromptOutputPath: string;
      videoPlannerOutputPath: string;
      scope: string;
    }>("artifacts/review-pack/latest.json");

    const index = readJson<{
      reviewId: string;
      evidenceMode: string;
      heroPath: {
        chain: string;
        sellSymbol: string;
        buySymbol: string;
        tradeUsd: number;
      };
      notIncluded: Array<{ kind: string; reason: string }>;
      scope: string;
    }>(latest.indexPath);

    const heroDecision = readJson<{
      decision: string;
      sellSymbol: string;
      buySymbol: string;
      tradeUsd: number;
      chain: string;
    }>(latest.heroDecisionPath);

    const plannerStep = readJson<{
      autochainStatus: string;
      plannerHandoff: unknown;
      operatorAction: string;
      plannerUrl: string;
      plannerPayload: unknown;
    }>(latest.plannerStepPath);

    const txNote = readJson<{
      network: string;
      networkName: string;
      txHash: string;
      explorerUrl: string;
      source: string;
      status: string;
      note: string;
    }>(latest.txNotePath);

    const videoPromptOutput = readJson<{
      decision: string;
      analysis: {
        totalValueUsd: number;
        driftThresholdPercent: number;
        assets: Array<{
          symbol: string;
          valueUsd: number;
          currentPercent: number;
          targetPercent: number;
          driftPercent: number;
          status: string;
        }>;
      };
      recommendation: {
        sellSymbol: string;
        buySymbol: string;
        tradeUsd: number;
      };
      autochain: {
        status: string;
        chain: string;
        plannerPayload: {
          chain: string;
          inputSymbol: string;
          outputSymbol: string;
          tradeUsd: number;
        };
        plannerUrl: string;
        plannerHandoff: {
          skill: string;
          stopCondition: string;
        };
        operatorAction: string;
      };
    }>(latest.videoPromptOutputPath);

    const videoPlannerOutput = readJson<{
      skill: string;
      chain: string;
      inputSymbol: string;
      outputSymbol: string;
      tradeUsd: number;
      confirmReadyUrl: string;
      stopCondition: string;
      source: string;
      status: string;
    }>(latest.videoPlannerOutputPath);

    expect(latest.reviewId).toBe("2026-04-15-xlayer-usdc-wokb-hero-review");
    expect(latest.evidenceMode).toBe("hero-review-pack");
    expect(index.reviewId).toBe(latest.reviewId);
    expect(index.heroPath).toEqual({
      chain: "xlayer",
      sellSymbol: "USDC",
      buySymbol: "WOKB",
      tradeUsd: 5
    });
    expect(index.notIncluded).toEqual([
      {
        kind: "planner-output",
        reason:
          "No verified uniswap-swap-planner output is stored for the bounded 5 USDC canonical release contract."
      }
    ]);

    expect(heroDecision).toEqual({
      decision: heroDemo.advice.decision,
      sellSymbol: heroDemo.advice.recommendation?.sellSymbol,
      buySymbol: heroDemo.advice.recommendation?.buySymbol,
      tradeUsd: heroDemo.advice.recommendation?.tradeUsd,
      chain: heroDemo.autochain.chain
    });

    expect(plannerStep).toEqual({
      autochainStatus: heroDemo.autochain.status,
      plannerHandoff: heroDemo.autochain.plannerHandoff,
      operatorAction: heroDemo.autochain.operatorAction,
      plannerUrl: heroDemo.autochain.plannerUrl,
      plannerPayload: heroDemo.autochain.plannerPayload
    });
    expect(txNote).toEqual({
      network: "eip155:196",
      networkName: "X Layer",
      txHash:
        "0x19acc4267e0954101d18399329023e357508813845944e95e94863d83c0f4929",
      explorerUrl:
        "https://web3.okx.com/explorer/x-layer/tx/0x19acc4267e0954101d18399329023e357508813845944e95e94863d83c0f4929",
      source: "operator-confirmed live demo transaction",
      status: "accepted_on_l2",
      note:
        "The linked tx matches the recorded video prompt variant with target 70/30, drift 1, and min trade 1, which produced a 3 USDC prepared handoff on the same hero pair. The bounded release contract still remains the 5 USDC prepared handoff."
    });
    expect(videoPromptOutput).toMatchObject({
      decision: "rebalance",
      analysis: {
        totalValueUsd: 10,
        driftThresholdPercent: 1,
        assets: [
          {
            symbol: "USDC",
            valueUsd: 10,
            currentPercent: 100,
            targetPercent: 70,
            driftPercent: 30,
            status: "over"
          },
          {
            symbol: "WOKB",
            valueUsd: 0,
            currentPercent: 0,
            targetPercent: 30,
            driftPercent: -30,
            status: "under"
          }
        ]
      },
      recommendation: {
        sellSymbol: "USDC",
        buySymbol: "WOKB",
        tradeUsd: 3
      },
      autochain: {
        status: "prepared",
        chain: "xlayer",
        plannerPayload: {
          chain: "xlayer",
          inputSymbol: "USDC",
          outputSymbol: "WOKB",
          tradeUsd: 3
        },
        plannerHandoff: {
          skill: "uniswap-swap-planner",
          stopCondition: "before_execution"
        },
        operatorAction: "confirm_swap"
      }
    });
    expect(videoPlannerOutput).toEqual({
      skill: "uniswap-swap-planner",
      chain: "xlayer",
      inputSymbol: "USDC",
      outputSymbol: "WOKB",
      tradeUsd: 3,
      confirmReadyUrl:
        "https://app.uniswap.org/swap?chain=xlayer&inputCurrency=0x74b7f16337b8972027f6196a17a631ac6de26d22&outputCurrency=0xe538905cf8410324e03a5a23c1c177a474d59b2b&value=3&field=INPUT",
      stopCondition: "before_execution",
      source: "recorded follow-up planner step from the demo video",
      status: "captured"
    });
  });

  it("documents the prompt contract around autochain without a duplicate top-level plannerHandoff", () => {
    const readme = readText("README.md");

    expect(readme).toContain(
      "Return only decision, recommendation, autochain. Stop after the prepared handoff."
    );
    expect(readme).not.toContain(
      "Return only decision, recommendation, autochain, plannerHandoff. Stop after the prepared handoff."
    );
    expect(readme).toContain("Verification at the time of this release:");
    expect(readme).toContain("## 7. Demo Output Shape");
    expect(readme).toContain("## 8. Files");
    expect(readme).toContain("video-prompt-output.json");
    expect(readme).toContain("video-planner-output.json");
    expect(readme).toContain("target `70 / 30`, drift `1`, min trade `1`");
    expect(readme).toContain(
      "https://web3.okx.com/explorer/x-layer/tx/0x19acc4267e0954101d18399329023e357508813845944e95e94863d83c0f4929"
    );
    expect(readme).toContain(
      "https://web3.okx.com/explorer/x-layer/address/0x9c5F3f9C728248e18fa8941Bd2788a9dBE064975"
    );
    expect(readme).toContain("https://t.me/kleggy00");
  });
});
