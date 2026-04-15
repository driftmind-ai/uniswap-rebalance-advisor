import { describe, expect, it } from "vitest";

import { createUniswapRebalanceAdvisor } from "./index.js";

describe("uniswap-rebalance-advisor", () => {
  it("returns a rebalance decision with trade sizing and execution routing", () => {
    const advisor = createUniswapRebalanceAdvisor({
      driftThresholdPercent: 5,
      minTradeUsd: 25
    });

    const result = advisor.advise({
      holdings: [
        { symbol: "USDC", valueUsd: 800, targetPercent: 50 },
        { symbol: "WOKB", valueUsd: 200, targetPercent: 50 }
      ]
    });

    expect(result.decision).toBe("rebalance");
    expect(result.recommendation).toEqual({
      sellSymbol: "USDC",
      buySymbol: "WOKB",
      tradeUsd: 300,
      rationale: [
        "USDC is the most overweight asset versus target allocation.",
        "WOKB is the most underweight asset versus target allocation.",
        "tradeUsd is capped to the smaller of the sell excess and buy deficit."
      ]
    });
    expect(result.executionPlan.nextSkill).toBe("uniswap-swap-planner");
    expect(result.executionPlan.optionalSkills).toContain("treasury-guard-skill");
    expect(result.warnings).toEqual([]);
  });

  it("returns hold when allocation drift stays within threshold", () => {
    const advisor = createUniswapRebalanceAdvisor({
      driftThresholdPercent: 5,
      minTradeUsd: 25
    });

    const result = advisor.advise({
      holdings: [
        { symbol: "USDC", valueUsd: 520, targetPercent: 50 },
        { symbol: "WOKB", valueUsd: 480, targetPercent: 50 }
      ]
    });

    expect(result.decision).toBe("hold");
    expect(result.recommendation).toBeNull();
    expect(result.executionPlan.nextSkill).toBeNull();
    expect(result.warnings).toEqual([]);
  });

  it("returns blocked when constraints remove the best rebalance pair", () => {
    const advisor = createUniswapRebalanceAdvisor({
      driftThresholdPercent: 5,
      minTradeUsd: 25
    });

    const result = advisor.advise({
      holdings: [
        { symbol: "USDC", valueUsd: 800, targetPercent: 50 },
        { symbol: "WOKB", valueUsd: 200, targetPercent: 50 }
      ],
      constraints: {
        allowedSellSymbols: ["WBTC"]
      }
    });

    expect(result.decision).toBe("blocked");
    expect(result.recommendation).toBeNull();
    expect(result.executionPlan.nextSkill).toBeNull();
    expect(result.warnings).toContain(
      "Constraints removed all eligible sell candidates for the required rebalance."
    );
  });

  it("caps tradeUsd with maxTradeUsd when provided", () => {
    const advisor = createUniswapRebalanceAdvisor({
      driftThresholdPercent: 5,
      minTradeUsd: 25,
      maxTradeUsd: 100
    });

    const result = advisor.advise({
      holdings: [
        { symbol: "USDC", valueUsd: 800, targetPercent: 50 },
        { symbol: "WOKB", valueUsd: 200, targetPercent: 50 }
      ]
    });

    expect(result.decision).toBe("rebalance");
    expect(result.recommendation?.tradeUsd).toBe(100);
  });

  it("returns hold when the best trade is smaller than minTradeUsd", () => {
    const advisor = createUniswapRebalanceAdvisor({
      driftThresholdPercent: 5,
      minTradeUsd: 80
    });

    const result = advisor.advise({
      holdings: [
        { symbol: "USDC", valueUsd: 560, targetPercent: 50 },
        { symbol: "WOKB", valueUsd: 440, targetPercent: 50 }
      ]
    });

    expect(result.decision).toBe("hold");
    expect(result.recommendation).toBeNull();
    expect(result.executionPlan.nextSkill).toBeNull();
    expect(result.warnings).toContain(
      "The highest-priority rebalance trade is smaller than minTradeUsd."
    );
  });
});
