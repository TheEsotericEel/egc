/**
 * calc-core: pure math and types. No React. Deterministic rounding.
 */

export type CalcInputs = {
  // Sale
  price: number;
  quantity: number;
  cogs: number;

  // Shipping
  buyerPaysShipping: boolean;
  shippingChargeToBuyer: number;
  yourShippingCost: number;
  packagingCostPerOrder: number;
  insuranceCost: number;
  handlingFeeToBuyer: number;

  // Promotions / Ads
  promotedListingsRate: number;   // %
  promoShare: number;             // %
  promoAdvancedBudget: number;

  // Store and fees
  finalValueFeeRate: number;      // %
  categoryFeeOverrideRate: number;// %
  topRatedSellerDiscountRate: number; // %
  paymentProcessingRate: number;  // %
  paymentFixedFee: number;
  monthlyStoreFee: number;

  // Discounts / Markdown
  sellerCouponPercent: number;    // %
  offerToBuyerPercent: number;    // %

  // Returns / Refunds
  returnRatePercent: number;      // %
  avgRefundPercent: number;       // %
  labelCostOnReturns: number;
  restockingFeePercent: number;   // %

  // Taxes
  salesTaxOnItem: number;         // %
  marketplaceFacilitatorTax: boolean;

  // Payments / Misc platform
  disputeRatePercent: number;     // %
  avgDisputeLoss: number;

  // International
  intlFeePercent: number;         // %
  intlExtraShipCost: number;

  // Other
  miscFixedCostPerOrder: number;
  miscPercentOfGross: number;     // %
};

export type CalcResult = {
  qty: number;
  itemSubtotal: number;     // after discounts
  shippingRevenue: number;
  gross: number;

  finalValueFee: number;
  processingFee: number;
  promoFee: number;
  miscPctFee: number;
  intlPctFee: number;
  disputeEV: number;

  totalCOGS: number;
  totalShipCost: number;
  perOrderFixed: number;
  expectedReturnLoss: number;

  fees: number;             // sum of fee buckets above
  net: number;
  marginPct: number;
};

function pct(n: number) { return n / 100; }

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Core compute. Monetary outputs rounded to 2 decimals.
 */
export function compute(inputs: CalcInputs): CalcResult {
  const qty = Number.isFinite(inputs.quantity) ? inputs.quantity : 0;
  const price = Number.isFinite(inputs.price) ? inputs.price : 0;
  const cogs = Number.isFinite(inputs.cogs) ? inputs.cogs : 0;

  const itemSubtotalRaw = price * qty;

  const buyerPaysShipping = !!inputs.buyerPaysShipping;
  const shippingChargeToBuyer = inputs.shippingChargeToBuyer || 0;
  const yourShippingCost = inputs.yourShippingCost || 0;
  const packaging = inputs.packagingCostPerOrder || 0;
  const insurance = inputs.insuranceCost || 0;
  const handlingToBuyer = inputs.handlingFeeToBuyer || 0;

  // Discounts combined
  const sellerCoupon = pct(inputs.sellerCouponPercent || 0);
  const offerToBuyer = pct(inputs.offerToBuyerPercent || 0);
  const discountMultiplier = clamp(1 - (sellerCoupon + offerToBuyer), 0, 1);

  // Gross base
  const discountedItemSubtotal = itemSubtotalRaw * discountMultiplier;
  const shippingRevenue = buyerPaysShipping ? (shippingChargeToBuyer + handlingToBuyer) : 0;
  const grossBase = discountedItemSubtotal + shippingRevenue;

  // FVF with optional override + TRS discount
  const baseFvf = (inputs.categoryFeeOverrideRate || 0) > 0
    ? inputs.categoryFeeOverrideRate
    : (inputs.finalValueFeeRate || 0);
  const trsDiscount = pct(inputs.topRatedSellerDiscountRate || 0);
  const effectiveFvfRate = Math.max(0, baseFvf * (1 - trsDiscount));
  const finalValueFee = grossBase * pct(effectiveFvfRate);

  // Payment processing
  const processingFee = grossBase * pct(inputs.paymentProcessingRate || 0) + (qty > 0 ? (inputs.paymentFixedFee || 0) : 0);

  // Promoted Listings EV
  const promoRate = pct(inputs.promotedListingsRate || 0);
  const promoShare = clamp(pct(inputs.promoShare || 0), 0, 1);
  const promoFee = grossBase * promoRate * promoShare;

  // Misc percent-of-gross and international percent
  const miscPctFee = grossBase * pct(inputs.miscPercentOfGross || 0);
  const intlPctFee = grossBase * pct(inputs.intlFeePercent || 0);

  // Returns EV
  const returnRate = clamp(pct(inputs.returnRatePercent || 0), 0, 1);
  const avgRefundPct = clamp(pct(inputs.avgRefundPercent || 0), 0, 1);
  const restockPct = clamp(pct(inputs.restockingFeePercent || 0), 0, 1);
  const expectedReturnLoss = returnRate * (grossBase * avgRefundPct - grossBase * restockPct + (inputs.labelCostOnReturns || 0));

  // Disputes EV
  const disputeEV = clamp(pct(inputs.disputeRatePercent || 0), 0, 1) * (inputs.avgDisputeLoss || 0);

  // Per-order fixed costs
  const perOrderFixed = packaging + insurance + (inputs.miscFixedCostPerOrder || 0);

  // Shipping cost you pay
  const totalShipCost = (yourShippingCost || 0) + (inputs.intlExtraShipCost || 0);

  // COGS
  const totalCOGS = cogs * qty;

  // Fees sum
  const fees = finalValueFee + processingFee + promoFee + miscPctFee + intlPctFee + disputeEV;

  // Net
  const netRaw = grossBase - fees - totalCOGS - totalShipCost - perOrderFixed - expectedReturnLoss;

  const result: CalcResult = {
    qty,
    itemSubtotal: round2(discountedItemSubtotal),
    shippingRevenue: round2(shippingRevenue),
    gross: round2(grossBase),

    finalValueFee: round2(finalValueFee),
    processingFee: round2(processingFee),
    promoFee: round2(promoFee),
    miscPctFee: round2(miscPctFee),
    intlPctFee: round2(intlPctFee),
    disputeEV: round2(disputeEV),

    totalCOGS: round2(totalCOGS),
    totalShipCost: round2(totalShipCost),
    perOrderFixed: round2(perOrderFixed),
    expectedReturnLoss: round2(expectedReturnLoss),

    fees: round2(fees),
    net: round2(netRaw),
    marginPct: grossBase > 0 ? Math.round(((netRaw / grossBase) * 100 + Number.EPSILON) * 100) / 100 : 0,
  };

  return result;
}

// Simple helpers
export function asp(totalRevenue: number, totalUnits: number) {
  if (!Number.isFinite(totalRevenue) || !Number.isFinite(totalUnits) || totalUnits <= 0) return 0;
  return round2(totalRevenue / totalUnits);
}

export function str(sold: number, listed: number) {
  if (!Number.isFinite(sold) || !Number.isFinite(listed) || listed <= 0) return 0;
  return Math.round(((sold / listed) * 100 + Number.EPSILON) * 100) / 100;
}

/**
 * Lightweight helpers to match existing app imports.
 * These do not replace compute(); they cover simple scenarios.
 */
export function gross(itemPrice: number, shippingCharged: number) {
  const g = (Number(itemPrice) || 0) + (Number(shippingCharged) || 0);
  return round2(g);
}

export function net(
  itemPrice: number,
  shippingCharged: number,
  shippingCost: number,
  cogs: number,
  feeRate: number // decimal, e.g., 0.13 for 13%
) {
  const g = gross(itemPrice, shippingCharged);
  const fees = g * (Number(feeRate) || 0);
  const n = g - fees - (Number(shippingCost) || 0) - (Number(cogs) || 0);
  return round2(n);
}




