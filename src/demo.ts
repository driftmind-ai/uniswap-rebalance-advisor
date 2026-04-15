import { createUniswapRebalanceAdvisor } from "./index.js";
import { prepareAutochainDemo } from "./planner-bridge.js";

const advisor = createUniswapRebalanceAdvisor({
  driftThresholdPercent: 5,
  minTradeUsd: 5
});

const heroAdvice = advisor.advise({
  holdings: [
    { symbol: "USDC", valueUsd: 10, targetPercent: 50 },
    { symbol: "WOKB", valueUsd: 0, targetPercent: 50 }
  ]
});

const heroDemo = prepareAutochainDemo(heroAdvice, {
  chain: "xlayer"
});

const appendix = {
  hold: advisor.advise({
    holdings: [
      { symbol: "USDC", valueUsd: 520, targetPercent: 50 },
      { symbol: "WOKB", valueUsd: 480, targetPercent: 50 }
    ]
  }),
  blocked: advisor.advise({
    holdings: [
      { symbol: "USDC", valueUsd: 800, targetPercent: 50 },
      { symbol: "WOKB", valueUsd: 200, targetPercent: 50 }
    ],
    constraints: {
      allowedSellSymbols: ["WBTC"]
    }
  })
};

console.log(
  JSON.stringify(
    {
      heroDemo,
      appendix
    },
    null,
    2
  )
);
