// Central place for tunable values.

export const COINS_PER_DOLLAR = Number(process.env.COINS_PER_DOLLAR || 1000);

export function coinsToDollars(coins) {
  const perDollar = COINS_PER_DOLLAR || 1000;
  return (Number(coins || 0) / perDollar);
}

export function formatDollars(coins) {
  return coinsToDollars(coins).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
