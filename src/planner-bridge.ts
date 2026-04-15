import type { RebalanceAdvisorResult } from "./index.js";

type DemoChain = "xlayer";

type PlannerPayload = {
  chain: DemoChain;
  inputSymbol: "USDC";
  inputTokenAddress: "0x74b7f16337b8972027f6196a17a631ac6de26d22";
  outputSymbol: "WOKB";
  outputTokenAddress: "0xe538905cf8410324e03a5a23c1c177a474d59b2b";
  tradeUsd: number;
};

type AutochainStatus =
  | "not_needed"
  | "blocked"
  | "prepared"
  | "unsupported_pair";

type PlannerHandoff = {
  skill: "uniswap-swap-planner";
  prompt: string;
  stopCondition: "before_execution";
};

export type AutochainDemoResult = {
  advice: RebalanceAdvisorResult;
  autochain: {
    status: AutochainStatus;
    chain: DemoChain | null;
    plannerPayload: PlannerPayload | null;
    plannerUrl: string | null;
    plannerHandoff: PlannerHandoff | null;
    operatorAction: "confirm_swap" | null;
    demoSummary: string;
  };
};

type PrepareAutochainOptions = {
  chain: DemoChain;
};

const HERO_PAIR = {
  chain: "xlayer" as const,
  sellSymbol: "USDC" as const,
  sellTokenAddress: "0x74b7f16337b8972027f6196a17a631ac6de26d22" as const,
  buySymbol: "WOKB" as const,
  buyTokenAddress: "0xe538905cf8410324e03a5a23c1c177a474d59b2b" as const
};

function buildPlannerUrl(payload: PlannerPayload) {
  return `https://app.uniswap.org/swap?chain=${payload.chain}&inputCurrency=${payload.inputTokenAddress}&outputCurrency=${payload.outputTokenAddress}&value=${payload.tradeUsd}&field=INPUT`;
}

function buildPlannerHandoff(payload: PlannerPayload): PlannerHandoff {
  return {
    skill: "uniswap-swap-planner",
    prompt: `Use uniswap-swap-planner to prepare an X Layer swap from ${payload.inputSymbol} to ${payload.outputSymbol} for ${payload.tradeUsd} ${payload.inputSymbol}. Return the best route and a confirm-ready Uniswap URL. Stop before execution.`,
    stopCondition: "before_execution"
  };
}

export function prepareAutochainDemo(
  advice: RebalanceAdvisorResult,
  options: PrepareAutochainOptions
): AutochainDemoResult {
  if (advice.decision === "hold") {
    return {
      advice,
      autochain: {
        status: "not_needed",
        chain: null,
        plannerPayload: null,
        plannerUrl: null,
        plannerHandoff: null,
        operatorAction: null,
        demoSummary:
          "No planner handoff prepared because the advisor decision is hold."
      }
    };
  }

  if (advice.decision === "blocked") {
    return {
      advice,
      autochain: {
        status: "blocked",
        chain: null,
        plannerPayload: null,
        plannerUrl: null,
        plannerHandoff: null,
        operatorAction: null,
        demoSummary:
          "No planner handoff prepared because the advisor decision is blocked."
      }
    };
  }

  if (
    options.chain !== HERO_PAIR.chain ||
    advice.recommendation?.sellSymbol !== HERO_PAIR.sellSymbol ||
    advice.recommendation?.buySymbol !== HERO_PAIR.buySymbol
  ) {
    return {
      advice,
      autochain: {
        status: "unsupported_pair",
        chain: options.chain,
        plannerPayload: null,
        plannerUrl: null,
        plannerHandoff: null,
        operatorAction: null,
        demoSummary:
          "Advisor returned a rebalance, but the result is outside the first-pass X Layer USDC -> WOKB hero bridge."
      }
    };
  }

  const payload: PlannerPayload = {
    chain: HERO_PAIR.chain,
    inputSymbol: HERO_PAIR.sellSymbol,
    inputTokenAddress: HERO_PAIR.sellTokenAddress,
    outputSymbol: HERO_PAIR.buySymbol,
    outputTokenAddress: HERO_PAIR.buyTokenAddress,
    tradeUsd: advice.recommendation.tradeUsd
  };

  return {
    advice,
    autochain: {
      status: "prepared",
      chain: options.chain,
      plannerPayload: payload,
      plannerUrl: buildPlannerUrl(payload),
      plannerHandoff: buildPlannerHandoff(payload),
      operatorAction: "confirm_swap",
      demoSummary:
        "Prepared a concrete X Layer Uniswap planner handoff with a ready-to-use downstream skill prompt. Final swap remains operator-confirmed."
    }
  };
}
