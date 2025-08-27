import { create } from "zustand";
import type { InputBuckets, CalcOutput } from "@egc/calc-core";
import { compute } from "@egc/calc-core";

// Zeroed defaults matching calc-core types
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

const computeSafe = (input: InputBuckets): CalcOutput => compute(input);

export const useCalculatorStore = create<State>((set, get) => ({
  input: defaultBuckets,
  output: computeSafe(defaultBuckets),

  set: (path, value) => {
    const [bucketKey, fieldKey] = path.split(".") as [keyof InputBuckets, string];
    const prev = get().input;
    const nextBucket = { ...(prev[bucketKey] as any), [fieldKey]: value };
    const nextInput = { ...prev, [bucketKey]: nextBucket } as InputBuckets;
    set({ input: nextInput, output: computeSafe(nextInput) });
  },

  setBucket: (key, bucket) => {
    const prev = get().input;
    const nextInput = { ...prev, [key]: { ...(prev[key] as any), ...(bucket as any) } } as InputBuckets;
    set({ input: nextInput, output: computeSafe(nextInput) });
  },

  recompute: () => set({ output: computeSafe(get().input) }),
}));
