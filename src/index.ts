export type Holding = {
  symbol: string;
  tokenAddress?: string;
  valueUsd: number;
  targetPercent: number;
};

export type Constraints = {
  excludedSymbols?: string[];
  allowedSellSymbols?: string[];
  allowedBuySymbols?: string[];
};

export type AdvisorConfig = {
  driftThresholdPercent: number;
  minTradeUsd?: number;
  maxTradeUsd?: number;
};

export type AdviceParams = {
  holdings: Holding[];
  constraints?: Constraints;
};

export type AssetStatus = "over" | "under" | "within";
export type Decision = "hold" | "rebalance" | "blocked";

type AnalysisAsset = Holding & {
  currentPercent: number;
  driftPercent: number;
  status: AssetStatus;
  excessUsd: number;
  deficitUsd: number;
};

export type RebalanceAdvisorResult = {
  decision: Decision;
  summary: string;
  totalValueUsd: number;
  analysis: {
    driftThresholdPercent: number;
    assets: Array<{
      symbol: string;
      valueUsd: number;
      currentPercent: number;
      targetPercent: number;
      driftPercent: number;
      status: AssetStatus;
    }>;
  };
  recommendation: null | {
    sellSymbol: string;
    buySymbol: string;
    tradeUsd: number;
    rationale: string[];
  };
  executionPlan: {
    nextSkill: string | null;
    optionalSkills: string[];
    steps: string[];
  };
  warnings: string[];
};

function roundToTwo(value: number) {
  return Number(value.toFixed(2));
}

function classifyAsset(
  driftPercent: number,
  driftThresholdPercent: number
): AssetStatus {
  if (driftPercent > driftThresholdPercent) {
    return "over";
  }

  if (driftPercent < -driftThresholdPercent) {
    return "under";
  }

  return "within";
}

function isExcluded(symbol: string, constraints?: Constraints) {
  return constraints?.excludedSymbols?.includes(symbol) ?? false;
}

function isAllowedSell(symbol: string, constraints?: Constraints) {
  if (isExcluded(symbol, constraints)) {
    return false;
  }

  if (!constraints?.allowedSellSymbols?.length) {
    return true;
  }

  return constraints.allowedSellSymbols.includes(symbol);
}

function isAllowedBuy(symbol: string, constraints?: Constraints) {
  if (isExcluded(symbol, constraints)) {
    return false;
  }

  if (!constraints?.allowedBuySymbols?.length) {
    return true;
  }

  return constraints.allowedBuySymbols.includes(symbol);
}

export function createUniswapRebalanceAdvisor(config: AdvisorConfig) {
  const minTradeUsd = config.minTradeUsd ?? 50;

  return {
    advise(params: AdviceParams): RebalanceAdvisorResult {
      const totalValueUsd = params.holdings.reduce(
        (sum, holding) => sum + holding.valueUsd,
        0
      );

      const assets: AnalysisAsset[] = params.holdings.map((holding) => {
        const currentPercent =
          totalValueUsd === 0 ? 0 : (holding.valueUsd / totalValueUsd) * 100;
        const driftPercent = currentPercent - holding.targetPercent;
        const status = classifyAsset(
          driftPercent,
          config.driftThresholdPercent
        );
        const targetValueUsd = (holding.targetPercent / 100) * totalValueUsd;

        return {
          ...holding,
          currentPercent: roundToTwo(currentPercent),
          driftPercent: roundToTwo(driftPercent),
          status,
          excessUsd: roundToTwo(Math.max(0, holding.valueUsd - targetValueUsd)),
          deficitUsd: roundToTwo(Math.max(0, targetValueUsd - holding.valueUsd))
        };
      });

      const rawOver = assets
        .filter((asset) => asset.status === "over")
        .sort((left, right) => right.driftPercent - left.driftPercent);
      const rawUnder = assets
        .filter((asset) => asset.status === "under")
        .sort((left, right) => left.driftPercent - right.driftPercent);

      const eligibleOver = rawOver.filter((asset) =>
        isAllowedSell(asset.symbol, params.constraints)
      );
      const eligibleUnder = rawUnder.filter((asset) =>
        isAllowedBuy(asset.symbol, params.constraints)
      );

      const analysis = {
        driftThresholdPercent: config.driftThresholdPercent,
        assets: assets.map((asset) => ({
          symbol: asset.symbol,
          valueUsd: asset.valueUsd,
          currentPercent: asset.currentPercent,
          targetPercent: asset.targetPercent,
          driftPercent: asset.driftPercent,
          status: asset.status
        }))
      };

      if (rawOver.length === 0 || rawUnder.length === 0) {
        return {
          decision: "hold",
          summary:
            "No rebalance needed. Allocation drift stays within the configured threshold.",
          totalValueUsd: roundToTwo(totalValueUsd),
          analysis,
          recommendation: null,
          executionPlan: {
            nextSkill: null,
            optionalSkills: [],
            steps: [
              "Keep monitoring allocation drift against the configured threshold."
            ]
          },
          warnings: []
        };
      }

      const warnings: string[] = [];

      if (eligibleOver.length === 0) {
        warnings.push(
          "Constraints removed all eligible sell candidates for the required rebalance."
        );
      }

      if (eligibleUnder.length === 0) {
        warnings.push(
          "Constraints removed all eligible buy candidates for the required rebalance."
        );
      }

      if (warnings.length > 0) {
        return {
          decision: "blocked",
          summary:
            "Rebalance is needed, but the current constraints block a safe sell/buy recommendation.",
          totalValueUsd: roundToTwo(totalValueUsd),
          analysis,
          recommendation: null,
          executionPlan: {
            nextSkill: null,
            optionalSkills: [],
            steps: [
              "Review the excluded and allowed symbol constraints.",
              "Relax the blocking constraint or rebalance manually before invoking swap-planner."
            ]
          },
          warnings
        };
      }

      const sell = eligibleOver[0];
      const buy = eligibleUnder[0];
      const uncappedTradeUsd = Math.min(sell.excessUsd, buy.deficitUsd);
      const tradeUsd =
        config.maxTradeUsd === undefined
          ? uncappedTradeUsd
          : Math.min(uncappedTradeUsd, config.maxTradeUsd);

      if (tradeUsd < minTradeUsd) {
        return {
          decision: "hold",
          summary:
            "Rebalance opportunity detected, but the highest-priority trade is too small to execute.",
          totalValueUsd: roundToTwo(totalValueUsd),
          analysis,
          recommendation: null,
          executionPlan: {
            nextSkill: null,
            optionalSkills: [],
            steps: [
              "Keep monitoring until the portfolio drift produces a trade above minTradeUsd."
            ]
          },
          warnings: [
            "The highest-priority rebalance trade is smaller than minTradeUsd."
          ]
        };
      }

      return {
        decision: "rebalance",
        summary:
          "Rebalance is recommended. Use the primary sell/buy pair with uniswap-swap-planner for the next step.",
        totalValueUsd: roundToTwo(totalValueUsd),
        analysis,
        recommendation: {
          sellSymbol: sell.symbol,
          buySymbol: buy.symbol,
          tradeUsd: roundToTwo(tradeUsd),
          rationale: [
            `${sell.symbol} is the most overweight asset versus target allocation.`,
            `${buy.symbol} is the most underweight asset versus target allocation.`,
            "tradeUsd is capped to the smaller of the sell excess and buy deficit."
          ]
        },
        executionPlan: {
          nextSkill: "uniswap-swap-planner",
          optionalSkills: [],
          steps: [
            "Review the proposed sell and buy assets.",
            "Pass the pair and tradeUsd to uniswap-swap-planner for route planning.",
            "Validate the expected post-trade allocation before execution."
          ]
        },
        warnings: []
      };
    }
  };
}
