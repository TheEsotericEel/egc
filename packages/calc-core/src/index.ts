export type {
  SaleAmounts,
  ShippingCosts,
  CostOfGoods,
  SellerFees,
  AdvertisingFees,
  PaymentProcessing,
  CrossBorderCurrency,
  Taxes,
  RefundsReturns,
  AdjustmentsDisputes,
  InternationalPrograms,
  PayoutTiming,
  StoreOverhead,
  GoalTracking,
  AttributionKnobs,
  InputBuckets,
  FeeBreakdown,
  Rollup,
  CalcOutput,
  ComputeFn,
} from "./types";

/** Basic helpers used by the manual page prototype */
export function gross(itemPrice: number, shippingCharged: number): number {
  const ip = Number.isFinite(itemPrice) ? itemPrice : 0;
  const sc = Number.isFinite(shippingCharged) ? shippingCharged : 0;
  return ip + sc;
}

export function net(
  itemPrice: number,
  shippingCharged: number,
  shippingCost: number,
  cogs: number,
  feeRate: number
): number {
  const g = gross(itemPrice, shippingCharged);
  const fr = Number.isFinite(feeRate) ? feeRate : 0;
  const fees = g * fr;
  const sh = Number.isFinite(shippingCost) ? shippingCost : 0;
  const cg = Number.isFinite(cogs) ? cogs : 0;
  return g - fees - sh - cg;
}

/** Full calculator compute stub: deterministic, all NaNs → 0 */
const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function compute(input: import("./types").InputBuckets): import("./types").CalcOutput {
  const sale = input.sale;
  const shipping = input.shipping;
  const cogs = input.cogs;
  const sf = input.sellerFees;
  const ads = input.ads;
  const pay = input.payments;
  const xb = input.xborder;
  const tax = input.taxes;
  const ref = input.refunds;
  const adj = input.adjustments;
  const intl = input.intlPrograms;
  const overhead = input.storeOverhead;

  // Revenue model
  const qty = Math.max(1, Math.floor(n(sale.quantity)));
  const itemRevenue = n(sale.itemPrice) * qty;
  const shippingRevenue = n(sale.shippingChargedToBuyer);
  const tip = n(sale.tip);
  const grossRevenue = itemRevenue + shippingRevenue + tip;

  const discountsTotal =
    n(sale.sellerCouponDiscount) +
    n(sale.orderLevelDiscount) +
    n(sale.combinedOrderDiscount) +
    n(sale.giftCardOrStoreCreditApplied);

  // Exclude buyer tax if pass-through
  const buyerTax = tax.isBuyerTaxPassThrough ? 0 : n(tax.buyerTaxCollected);

  const netOfDiscounts = grossRevenue - discountsTotal + buyerTax;

  // Fees
  let finalValueFee = netOfDiscounts * n(sf.categoryFinalValueFeePct);
  // TRS/TRS+ discounts reduce final value fees
  finalValueFee = finalValueFee * (1 - n(sf.topRatedSellerDiscountPct) - n(sf.topRatedPlusDiscountPct));
  // Add surcharges as % on the same base
  const surchargesPct = n(sf.belowStandardSurchargePct) + n(sf.veryHighINADSurchargePct);
  const surcharges = netOfDiscounts * surchargesPct;

  // Respect category cap if provided
  if (n(sf.feeCapAmount) > 0) {
    finalValueFee = Math.min(finalValueFee, n(sf.feeCapAmount));
  }

  const perOrderFixedFee = n(sf.perOrderFixedFee);
  const listingUpgrades = n(sf.listingUpgradesTotal);
  const insertionFee = n(sf.insertionFeeAfterFree);
  const vehicleOrClassifiedFee = n(sf.vehicleOrClassifiedFee);

  // Advertising
  const adFeesStandard = netOfDiscounts * n(ads.promotedStandardPct) * n(ads.promotedStandardSharePct);
  const adFeesAdvanced = n(ads.promotedAdvancedSpend) * n(ads.promotedAdvancedSharePct);

  // Payment processing
  const paymentProcessing =
    netOfDiscounts * n(pay.processorPct) + n(pay.processorFixed) + n(pay.disputeOrChargebackFee);

  // Cross-border and currency
  const crossBorderFees =
    n(xb.internationalTxnFee) + netOfDiscounts * n(xb.currencyConversionPct) + n(xb.crossBorderHandling);

  // VAT/GST on seller fees can be provided directly
  const vatOnFees = n(tax.vatOnSellerFees);

  const feesTotal =
    finalValueFee +
    surcharges +
    perOrderFixedFee +
    listingUpgrades +
    insertionFee +
    vehicleOrClassifiedFee +
    adFeesStandard +
    adFeesAdvanced +
    paymentProcessing +
    crossBorderFees +
    vatOnFees;

  // Shipping costs
  const shippingCostTotal =
    n(shipping.postageLabelCost) +
    n(shipping.labelSurcharges) +
    n(shipping.insurance) +
    n(shipping.signatureOrConfirmation) +
    n(shipping.packagingMaterials) +
    n(shipping.returnShippingPaidBySeller) +
    n(shipping.offEbayLabelCost);

  // COGS
  const cogsTotal =
    n(cogs.itemAcquisitionCost) +
    n(cogs.prepOrRefurbCost) +
    n(cogs.inboundFreightToYou) +
    n(cogs.perUnitOverheadAllocation) * qty;

  // Refunds and adjustments
  const refundsTotal =
    n(ref.fullRefundAmount) +
    n(ref.partialRefundAmount) +
    n(ref.returnLabelCost) +
    n(ref.nonRefundableFees) -
    n(ref.restockingDeduction) -
    n(ref.feeCredits);

  const adjustmentsTotal =
    n(adj.inrOrSnadRefunds) + n(adj.paymentDisputesAgainstSeller) + n(adj.goodwillCredits) + n(adj.ebayAccountAdjustments) - n(adj.appealReversals);

  // International programs (treated as fees/costs)
  const intlTotal =
    n(intl.eBayInternationalShippingWithheld) +
    n(intl.internationalReturnHandling) -
    n(intl.dutiesAndImportTaxesPassThrough);

  // Overhead
  const overheadTotal =
    n(overhead.storeSubscriptionMonthlyFee) +
    n(overhead.thirdPartyToolsMonthly) -
    n(overhead.quarterlyCredits) -
    n(overhead.freeListingsAllotmentValue);

  const rollupGross = grossRevenue;
  const rollup: import("./types").Rollup = {
    gross: rollupGross,
    shippingRevenue,
    discountsTotal,
    netOfDiscounts,
    feesTotal: feesTotal + intlTotal,
    shippingCostTotal,
    cogsTotal,
    refundsTotal,
    adjustmentsTotal,
    overheadTotal,
    net:
      netOfDiscounts -
      (feesTotal + intlTotal) -
      shippingCostTotal -
      cogsTotal -
      refundsTotal -
      adjustmentsTotal -
      overheadTotal,
    marginPct: rollupGross > 0 ? ((netOfDiscounts -
      (feesTotal + intlTotal) -
      shippingCostTotal -
      cogsTotal -
      refundsTotal -
      adjustmentsTotal -
      overheadTotal) / rollupGross) * 100 : 0,
    confidence: "low",
  };

  const fees: import("./types").FeeBreakdown = {
    finalValueFee,
    perOrderFixedFee,
    surcharges,
    listingUpgrades,
    insertionFee,
    vehicleOrClassifiedFee,
    adFeesStandard,
    adFeesAdvanced,
    paymentProcessing,
    crossBorderFees,
    vatOnFees,
  };

  return { fees, rollup };
}