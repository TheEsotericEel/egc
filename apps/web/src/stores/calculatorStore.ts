import { create } from "zustand";
import { compute, type CalcInputs, type CalcResult } from "@egc/calc-core";

/**
 * App-local types. These are UI-oriented buckets and are NOT part of calc-core.
 */
export type InputBuckets = {
  sale: {
    itemPrice: number;
    quantity: number;
    shippingChargedToBuyer: number;
    sellerCouponDiscount: number;
    orderLevelDiscount: number;
    combinedOrderDiscount: number;
    giftCardOrStoreCreditApplied: number;
    tip: number;
  };
  shipping: {
    postageLabelCost: number;
    labelSurcharges: number;
    insurance: number;
    signatureOrConfirmation: number;
    packagingMaterials: number;
    returnShippingPaidBySeller: number;
    offEbayLabelCost: number;
  };
  cogs: {
    itemAcquisitionCost: number;
    prepOrRefurbCost: number;
    inboundFreightToYou: number;
    perUnitOverheadAllocation: number;
  };
  sellerFees: {
    categoryFinalValueFeePct: number;
    perOrderFixedFee: number;
    isStoreSubscriber: boolean;
    feeCapAmount: number;
    topRatedSellerDiscountPct: number;
    topRatedPlusDiscountPct: number;
    belowStandardSurchargePct: number;
    veryHighINADSurchargePct: number;
    listingUpgradesTotal: number;
    insertionFeeAfterFree: number;
    vehicleOrClassifiedFee: number;
  };
  ads: {
    promotedStandardPct: number;
    promotedStandardSharePct: number;
    promotedAdvancedSpend: number;
    promotedAdvancedSharePct: number;
    offEbayAdsAttribution: number;
  };
  payments: {
    processorPct: number;
    processorFixed: number;
    disputeOrChargebackFee: number;
    payoutHoldReserve: number;
  };
  xborder: {
    internationalTxnFee: number;
    currencyConversionPct: number;
    crossBorderHandling: number;
  };
  taxes: {
    buyerTaxCollected: number;
    isBuyerTaxPassThrough: boolean;
    taxIncludedInProcessorBase: boolean;
    vatOnSellerFees: number;
  };
  refunds: {
    fullRefundAmount: number;
    partialRefundAmount: number;
    restockingDeduction: number;
    returnLabelCost: number;
    feeCredits: number;
    nonRefundableFees: number;
  };
  adjustments: {
    inrOrSnadRefunds: number;
    paymentDisputesAgainstSeller: number;
    goodwillCredits: number;
    ebayAccountAdjustments: number;
    appealReversals: number;
  };
  intlPrograms: {
    eBayInternationalShippingWithheld: number;
    internationalReturnHandling: number;
    dutiesAndImportTaxesPassThrough: number;
  };
  payoutTiming: {
    fundsPending: number;
    fundsInTransit: number;
    payoutScheduleDays: number;
    cutoffMismatchAmount: number;
    heldReservesChange: number;
  };
  storeOverhead: {
    storeSubscriptionMonthlyFee: number;
    freeListingsAllotmentValue: number;
    quarterlyCredits: number;
    thirdPartyToolsMonthly: number;
  };
  goals: {
    weeklyNetTarget: number;
    monthlyNetTarget: number;
    rollingBaselineDays: number;
  };
  attribution: {
    pctWithPromotedStandard: number;
    pctWithPromotedAdvanced: number;
    pctWithCouponsOrMarkdowns: number;
    pctWithFreeShipping: number;
    pctCrossBorder: number;
    pctWithReturnsOrRefunds: number;
  };
};

// For now, treat CalcOutput as the core CalcResult.
// If you need more fields for UI, extend this type locally later.
export type CalcOutput = CalcResult;

/**
 * Adapter: map UI buckets -> calc-core CalcInputs
 * Conservative mapping using available fields. Refine as needed.
 */
function toCore(input: InputBuckets): CalcInputs {
  const price = Number(input.sale.itemPrice) || 0;
  const quantity = Math.max(0, Math.floor(Number(input.sale.quantity) || 0));
  const shippingCharged = Number(input.sale.shippingChargedToBuyer) || 0;

  // Discounts collapsed to a simple percent-of-price for now.
  // If you later model these precisely, update calc-core or this adapter.
  const discountDollars =
    (Number(input.sale.sellerCouponDiscount) || 0) +
    (Number(input.sale.orderLevelDiscount) || 0) +
    (Number(input.sale.combinedOrderDiscount) || 0);
  const discountPct = price > 0 ? (discountDollars / price) * 100 : 0;

  // Shipping costs you pay per order
  const shippingCost =
    (Number(input.shipping.postageLabelCost) || 0) +
    (Number(input.shipping.labelSurcharges) || 0) +
    (Number(input.shipping.insurance) || 0) +
    (Number(input.shipping.signatureOrConfirmation) || 0);
  const packagingCostPerOrder = Number(input.shipping.packagingMaterials) || 0;

  // COGS per item approximation
  const cogsPerItem =
    (Number(input.cogs.itemAcquisitionCost) || 0) +
    (Number(input.cogs.prepOrRefurbCost) || 0) +
    (Number(input.cogs.inboundFreightToYou) || 0) +
    (Number(input.cogs.perUnitOverheadAllocation) || 0);

  // Fees and payments
  const finalValueFeeRate = Number(input.sellerFees.categoryFinalValueFeePct) || 0;
  const paymentFixedFee = Number(input.sellerFees.perOrderFixedFee) || 0;
  const topRatedSellerDiscountRate =
    Number(input.sellerFees.topRatedSellerDiscountPct) || 0;

  const paymentProcessingRate = Number(input.payments.processorPct) || 0;

  // Ads
  const promotedListingsRate = Number(input.ads.promotedStandardPct) || 0;
  const promoShare = Number(input.ads.promotedStandardSharePct) || 0;
  const promoAdvancedBudget = Number(input.ads.promotedAdvancedSpend) || 0;

  // International
  const intlFeePercent =
    (Number(input.xborder.internationalTxnFee) || 0) +
    (Number(input.xborder.currencyConversionPct) || 0);
  const intlExtraShipCost = Number(input.xborder.crossBorderHandling) || 0;

  // Taxes
  const salesTaxOnItem = Number(input.taxes.buyerTaxCollected) || 0;
  const marketplaceFacilitatorTax = Boolean(input.taxes.isBuyerTaxPassThrough);

  // Refund expectations (simple)
  const avgRefundPercent = 100; // if a return occurs assume full refund
  const returnRatePercent =
    Math.max(
      0,
      Math.min(
        100,
        Number(input.attribution.pctWithReturnsOrRefunds) || 0
      )
    );

  // Misc
  const monthlyStoreFee = Number(input.storeOverhead.storeSubscriptionMonthlyFee) || 0;
  const miscFixedCostPerOrder = 0;
  const miscPercentOfGross = 0;

  const core: CalcInputs = {
    price,
    quantity,
    cogs: cogsPerItem,

    buyerPaysShipping: shippingCharged > 0,
    shippingChargeToBuyer: shippingCharged,
    yourShippingCost: shippingCost,
    packagingCostPerOrder,
    insuranceCost: 0,
    handlingFeeToBuyer: 0,

    promotedListingsRate,
    promoShare,
    promoAdvancedBudget,

    finalValueFeeRate,
    categoryFeeOverrideRate: 0,
    topRatedSellerDiscountRate,
    paymentProcessingRate,
    paymentFixedFee,
    monthlyStoreFee,

    sellerCouponPercent: Math.max(0, Math.min(100, discountPct)),
    offerToBuyerPercent: 0,

    returnRatePercent,
    avgRefundPercent,
    labelCostOnReturns: Number(input.refunds.returnLabelCost) || 0,
    restockingFeePercent: Math.max(0, Math.min(100, Number(input.refunds.restockingDeduction) || 0)),

    salesTaxOnItem,
    marketplaceFacilitatorTax,

    disputeRatePercent: Math.max(0, Math.min(100, Number(input.adjustments.paymentDisputesAgainstSeller) || 0)),
    avgDisputeLoss: 0,

    intlFeePercent,
    intlExtraShipCost,

    miscFixedCostPerOrder,
    miscPercentOfGross,
  };

  return core;
}

// Zeroed defaults matching app buckets
const defaultBuckets: InputBuckets = {
  sale: {
    itemPrice: 0, quantity: 1, shippingChargedToBuyer: 0,
    sellerCouponDiscount: 0, orderLevelDiscount: 0, combinedOrderDiscount: 0,
    giftCardOrStoreCreditApplied: 0, tip: 0,
  },
  shipping: {
    postageLabelCost: 0, labelSurcharges: 0, insurance: 0, signatureOrConfirmation: 0,
    packagingMaterials: 0, returnShippingPaidBySeller: 0, offEbayLabelCost: 0,
  },
  cogs: {
    itemAcquisitionCost: 0, prepOrRefurbCost: 0, inboundFreightToYou: 0, perUnitOverheadAllocation: 0,
  },
  sellerFees: {
    categoryFinalValueFeePct: 0, perOrderFixedFee: 0, isStoreSubscriber: false, feeCapAmount: 0,
    topRatedSellerDiscountPct: 0, topRatedPlusDiscountPct: 0,
    belowStandardSurchargePct: 0, veryHighINADSurchargePct: 0,
    listingUpgradesTotal: 0, insertionFeeAfterFree: 0, vehicleOrClassifiedFee: 0,
  },
  ads: {
    promotedStandardPct: 0, promotedStandardSharePct: 0,
    promotedAdvancedSpend: 0, promotedAdvancedSharePct: 0,
    offEbayAdsAttribution: 0,
  },
  payments: {
    processorPct: 0, processorFixed: 0, disputeOrChargebackFee: 0, payoutHoldReserve: 0,
  },
  xborder: {
    internationalTxnFee: 0, currencyConversionPct: 0, crossBorderHandling: 0,
  },
  taxes: {
    buyerTaxCollected: 0, isBuyerTaxPassThrough: true, taxIncludedInProcessorBase: false, vatOnSellerFees: 0,
  },
  refunds: {
    fullRefundAmount: 0, partialRefundAmount: 0, restockingDeduction: 0,
    returnLabelCost: 0, feeCredits: 0, nonRefundableFees: 0,
  },
  adjustments: {
    inrOrSnadRefunds: 0, paymentDisputesAgainstSeller: 0, goodwillCredits: 0,
    ebayAccountAdjustments: 0, appealReversals: 0,
  },
  intlPrograms: {
    eBayInternationalShippingWithheld: 0, internationalReturnHandling: 0, dutiesAndImportTaxesPassThrough: 0,
  },
  payoutTiming: {
    fundsPending: 0, fundsInTransit: 0, payoutScheduleDays: 7, cutoffMismatchAmount: 0, heldReservesChange: 0,
  },
  storeOverhead: {
    storeSubscriptionMonthlyFee: 0, freeListingsAllotmentValue: 0, quarterlyCredits: 0, thirdPartyToolsMonthly: 0,
  },
  goals: {
    weeklyNetTarget: 0, monthlyNetTarget: 0, rollingBaselineDays: 30,
  },
  attribution: {
    pctWithPromotedStandard: 0, pctWithPromotedAdvanced: 0, pctWithCouponsOrMarkdowns: 0,
    pctWithFreeShipping: 0, pctCrossBorder: 0, pctWithReturnsOrRefunds: 0,
  },
};

type State = {
  input: InputBuckets;
  output: CalcOutput;
  set: (path: string, value: unknown) => void;
  setBucket: <K extends keyof InputBuckets>(key: K, bucket: Partial<InputBuckets[K]>) => void;
  recompute: () => void;
};

const computeSafe = (input: InputBuckets): CalcOutput => compute(toCore(input));

export const useCalculatorStore = create<State>((set, get) => ({
  input: defaultBuckets,
  output: computeSafe(defaultBuckets),

  set: (path, value) => {
    const [bucketKey, fieldKey] = path.split(".") as [keyof InputBuckets, string];
    const prev = get().input;
    const nextBucket = { ...(prev[bucketKey] as Record<string, unknown>), [fieldKey]: value };
    const nextInput = { ...prev, [bucketKey]: nextBucket } as InputBuckets;
    set({ input: nextInput, output: computeSafe(nextInput) });
  },

  setBucket: (key, bucket) => {
    const prev = get().input;
    const nextInput = { ...prev, [key]: { ...(prev[key] as Record<string, unknown>), ...(bucket as Record<string, unknown>) } } as InputBuckets;
    set({ input: nextInput, output: computeSafe(nextInput) });
  },

  recompute: () => set({ output: computeSafe(get().input) }),
}));





