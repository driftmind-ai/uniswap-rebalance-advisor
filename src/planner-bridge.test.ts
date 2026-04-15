import { describe, expect, it } from "vitest";

import { createUniswapRebalanceAdvisor } from "./index.js";
import { prepareAutochainDemo } from "./planner-bridge.js";

describe("planner-bridge", () => {
  const advisor = createUniswapRebalanceAdvisor({
    driftThresholdPercent: 5,
    minTradeUsd: 5
  });

  it("prepares a planner handoff for the fixed X Layer USDC -> WOKB hero path", () => {
    const advice = advisor.advise({
      holdings: [
        { symbol: "USDC", valueUsd: 10, targetPercent: 50 },
        { symbol: "WOKB", valueUsd: 0, targetPercent: 50 }
      ]
    });

    const result = prepareAutochainDemo(advice, {
      chain: "xlayer"
    });

    expect(result.autochain.status).toBe("prepared");
    expect(result.autochain.chain).toBe("xlayer");
    expect(result.autochain.operatorAction).toBe("confirm_swap");
    expect(result.autochain.plannerPayload).toEqual({
      chain: "xlayer",
      inputSymbol: "USDC",
      inputTokenAddress: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
      outputSymbol: "WOKB",
      outputTokenAddress: "0xe538905cf8410324e03a5a23c1c177a474d59b2b",
      tradeUsd: 5
    });
    expect(result.autochain.plannerUrl).toBe(
      "https://app.uniswap.org/swap?chain=xlayer&inputCurrency=0x74b7f16337b8972027f6196a17a631ac6de26d22&outputCurrency=0xe538905cf8410324e03a5a23c1c177a474d59b2b&value=5&field=INPUT"
    );
    expect(result.autochain.plannerHandoff).toEqual({
      skill: "uniswap-swap-planner",
      prompt:
        "Use uniswap-swap-planner to prepare an X Layer swap from USDC to WOKB for 5 USDC. Return the best route and a confirm-ready Uniswap URL. Stop before execution.",
      stopCondition: "before_execution"
    });
  });

  it("returns not_needed when the advisor decision is hold", () => {
    const advice = advisor.advise({
      holdings: [
        { symbol: "USDC", valueUsd: 520, targetPercent: 50 },
        { symbol: "WOKB", valueUsd: 480, targetPercent: 50 }
      ]
    });

    const result = prepareAutochainDemo(advice, {
      chain: "xlayer"
    });

    expect(result.autochain.status).toBe("not_needed");
    expect(result.autochain.plannerPayload).toBeNull();
    expect(result.autochain.plannerUrl).toBeNull();
    expect(result.autochain.plannerHandoff).toBeNull();
  });

  it("returns blocked when the advisor decision is blocked", () => {
    const advice = advisor.advise({
      holdings: [
        { symbol: "USDC", valueUsd: 800, targetPercent: 50 },
        { symbol: "WOKB", valueUsd: 200, targetPercent: 50 }
      ],
      constraints: {
        allowedSellSymbols: ["WBTC"]
      }
    });

    const result = prepareAutochainDemo(advice, {
      chain: "xlayer"
    });

    expect(result.autochain.status).toBe("blocked");
    expect(result.autochain.plannerPayload).toBeNull();
    expect(result.autochain.plannerUrl).toBeNull();
    expect(result.autochain.plannerHandoff).toBeNull();
  });

  it("returns unsupported_pair for non-hero rebalance pairs", () => {
    const advice = advisor.advise({
      holdings: [
        { symbol: "WOKB", valueUsd: 800, targetPercent: 50 },
        { symbol: "USDC", valueUsd: 200, targetPercent: 50 }
      ]
    });

    const result = prepareAutochainDemo(advice, {
      chain: "xlayer"
    });

    expect(advice.decision).toBe("rebalance");
    expect(result.autochain.status).toBe("unsupported_pair");
    expect(result.autochain.plannerPayload).toBeNull();
    expect(result.autochain.plannerUrl).toBeNull();
    expect(result.autochain.plannerHandoff).toBeNull();
  });
});
