/**
 * Core input representing a single order or a single manual scenario entry.
 * Every field is numeric in base currency units unless noted.
 * Optional fields default to 0 in math functions.
 */

export type SaleAmounts = {
  itemPrice: number;                 // per-unit price before discounts
  quantity: number;                  // units in this line
  shippingChargedToBuyer: number;    // what buyer paid for shipping
  sellerCouponDiscount: number;      // seller-funded coupon amount
  orderLevelDiscount: number;        // markdown/sale applied at order
  combinedOrderDiscount: number;     // savings from combining orders
  giftCardOrStoreCreditApplied: number;
  tip: number;                       // tips if enabled
};

export type ShippingCosts = {
  postageLabelCost: number;          // eBay label cost for this order
  labelSurcharges: number;           // dim-weight, address correction, etc.
  insurance: number;
  signatureOrConfirmation: number;
  packagingMaterials: number;        // boxes, tape, mailers
  returnShippingPaidBySeller: number;
  offEbayLabelCost: number;          // when label purchased off eBay
};

export type CostOfGoods = {
  itemAcquisitionCost: number;       // COGS for all units
  prepOrRefurbCost: number;
  inboundFreightToYou: number;
  perUnitOverheadAllocation: number; // optional allocation
};

export type SellerFees = {
  categoryFinalValueFeePct: number;  // decimal (0.13 = 13%)
  perOrderFixedFee: number;          // fixed add-on per order/line
  isStoreSubscriber: boolean;        // toggles store vs non-store rate
  feeCapAmount: number;              // if category has cap, else 0
  topRatedSellerDiscountPct: number; // decimal
  topRatedPlusDiscountPct: number;   // decimal
  belowStandardSurchargePct: number; // decimal
  veryHighINADSurchargePct: number;  // decimal
  listingUpgradesTotal: number;      // subtitle, reserve, schedule, etc.
  insertionFeeAfterFree: number;
  vehicleOrClassifiedFee: number;
};

export type AdvertisingFees = {
  promotedStandardPct: number;       // decimal rate for impacted orders
  promotedStandardSharePct: number;  // % of orders impacted (0..1)
  promotedAdvancedSpend: number;     // CPC spend attributable here
  promotedAdvancedSharePct: number;  // % attributed to Advanced (0..1)
  offEbayAdsAttribution: number;     // if surfaced later; else 0
};

export type PaymentProcessing = {
  processorPct: number;              // decimal
  processorFixed: number;            // fixed fee per payout/txn
  disputeOrChargebackFee: number;
  payoutHoldReserve: number;         // amount held (timing only)
};

export type CrossBorderCurrency = {
  internationalTxnFee: number;
  currencyConversionPct: number;     // spread as decimal
  crossBorderHandling: number;
};

export type Taxes = {
  buyerTaxCollected: number;         // pass-through by default
  isBuyerTaxPassThrough: boolean;    // if true, excluded from revenue
  taxIncludedInProcessorBase: boolean;
  vatOnSellerFees: number;           // VAT/GST applied to fee totals
};

export type RefundsReturns = {
  fullRefundAmount: number;
  partialRefundAmount: number;
  restockingDeduction: number;
  returnLabelCost: number;
  feeCredits: number;                // FVF, ads, international, etc.
  nonRefundableFees: number;         // components not credited back
};

export type AdjustmentsDisputes = {
  inrOrSnadRefunds: number;          // outcomes against seller
  paymentDisputesAgainstSeller: number;
  goodwillCredits: number;           // appeasements
  ebayAccountAdjustments: number;    // other adjustments
  appealReversals: number;           // positive if money returned to you
};

export type InternationalPrograms = {
  eBayInternationalShippingWithheld: number; // EIS fees withheld
  internationalReturnHandling: number;
  dutiesAndImportTaxesPassThrough: number;   // collected then remitted
};

export type PayoutTiming = {
  fundsPending: number;
  fundsInTransit: number;
  payoutScheduleDays: number;        // cadence for modeling only
  cutoffMismatchAmount: number;      // timing diff bucket
  heldReservesChange: number;        // +increase, -release
};

export type StoreOverhead = {
  storeSubscriptionMonthlyFee: number;
  freeListingsAllotmentValue: number;  // value of allotment used
  quarterlyCredits: number;            // shipping/ads credits applied
  thirdPartyToolsMonthly: number;      // allocated portion
};

export type GoalTracking = {
  weeklyNetTarget: number;
  monthlyNetTarget: number;
  rollingBaselineDays: number;       // window for baseline calc
};

export type AttributionKnobs = {
  pctWithPromotedStandard: number;   // 0..1
  pctWithPromotedAdvanced: number;   // 0..1
  pctWithCouponsOrMarkdowns: number; // 0..1
  pctWithFreeShipping: number;       // 0..1
  pctCrossBorder: number;            // 0..1
  pctWithReturnsOrRefunds: number;   // 0..1
};

export type InputBuckets = {
  sale: SaleAmounts;
  shipping: ShippingCosts;
  cogs: CostOfGoods;
  sellerFees: SellerFees;
  ads: AdvertisingFees;
  payments: PaymentProcessing;
  xborder: CrossBorderCurrency;
  taxes: Taxes;
  refunds: RefundsReturns;
  adjustments: AdjustmentsDisputes;
  intlPrograms: InternationalPrograms;
  payoutTiming: PayoutTiming;
  storeOverhead: StoreOverhead;
  goals: GoalTracking;
  attribution: AttributionKnobs;
};

export type FeeBreakdown = {
  finalValueFee: number;
  perOrderFixedFee: number;
  surcharges: number;          // below standard, INAD, etc.
  listingUpgrades: number;
  insertionFee: number;
  vehicleOrClassifiedFee: number;
  adFeesStandard: number;
  adFeesAdvanced: number;
  paymentProcessing: number;
  crossBorderFees: number;
  vatOnFees: number;
};

export type Rollup = {
  gross: number;               // revenue before fees and COGS
  shippingRevenue: number;     // shipping charged to buyer
  discountsTotal: number;      // seller-funded discounts
  netOfDiscounts: number;      // gross - discounts you fund
  feesTotal: number;           // S FeeBreakdown
  shippingCostTotal: number;   // labels, surcharges, insurance, etc.
  cogsTotal: number;           // item acquisition + prep + overhead alloc
  refundsTotal: number;        // refunds net of credits
  adjustmentsTotal: number;    // accounts adjustments net
  overheadTotal: number;       // store + tools - credits
  net: number;                 // gross - fees - shippingCost - COGS - refunds - adjustments - overhead
  marginPct: number;           // net / gross
  confidence: "low" | "medium" | "high";
};

export type CalcOutput = {
  fees: FeeBreakdown;
  rollup: Rollup;
};

/**
 * Minimal function signature the UI will call once we implement math.
 * For now this is just a type. Implementation will follow in index.ts.
 */
export type ComputeFn = (input: InputBuckets) => CalcOutput;




