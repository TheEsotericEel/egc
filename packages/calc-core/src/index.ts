export function gross(itemPrice: number, shippingCharged: number): number {
  return itemPrice + shippingCharged;
}

export function fees(gross: number, feeRate: number): number {
  return gross * feeRate;
}

export function net(
  itemPrice: number,
  shippingCharged: number,
  shippingCost: number,
  cogs: number,
  feeRate: number
): number {
  const g = gross(itemPrice, shippingCharged);
  const f = fees(g, feeRate);
  return g - (shippingCost + cogs + f);
}
