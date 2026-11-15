const CENTAVOS_PER_PESO = 100;

/** Prices are whole pesos in `edition_comic`, but Stripe and the Order tables count centavos. */
export const pesosToCentavos = (pesos: number) => pesos * CENTAVOS_PER_PESO;
