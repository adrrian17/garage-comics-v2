import type { Stripe } from "stripe";

/** A Stripe Price for something sold once, and the id a Checkout Session line points at. */
export const priceFor = async (
  stripe: Pick<Stripe, "products" | "prices">,
  name: string,
  unitAmountCentavos: number
) => {
  // shortcut: a Product and a Price per Checkout Session because the Stripe emulator rejects inline `price_data`; create them once per Edition when that matters in the Stripe dashboard.
  const product = await stripe.products.create({ name });

  const price = await stripe.prices.create({
    product: product.id,
    currency: "mxn",
    unit_amount: unitAmountCentavos,
  });

  return price.id;
};
