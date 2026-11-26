export const COMMISSION_PERCENT = 10;

const PERCENT_DENOMINATOR = 100;

/**
 * Garage Cómics's share of a price, in centavos, rounded half up with integer math.
 * A whole-peso price makes 10% exact, so rounding only happens if the rate changes; the Author's share is the price minus this, so the two always add up.
 */
export const commissionCentavos = (
  priceCentavos: number,
  percent = COMMISSION_PERCENT
) =>
  Math.floor(
    (priceCentavos * percent + PERCENT_DENOMINATOR / 2) / PERCENT_DENOMINATOR
  );
