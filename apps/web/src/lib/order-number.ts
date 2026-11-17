/** The readable Order Number a Customer sees, such as GRG-1000. The database stores only the integer. */
export const formatOrderNumber = (number: number) => `GRG-${number}`;

export type OrderSearch = { number: number } | { email: string };

const ORDER_NUMBER_INPUT = /^(?:grg[\s-]?)?(?<number>\d+)$/iu;

/**
 * What an Admin typed to find an Order: an Order Number ("GRG-1042", "grg 1042", "1042") or else an email, compared without case.
 * Null for an empty box, which means no filter.
 */
export const parseOrderSearch = (input: string): OrderSearch | null => {
  const text = input.trim();

  if (text === "") {
    return null;
  }

  const number = Number(ORDER_NUMBER_INPUT.exec(text)?.groups?.number);

  return Number.isSafeInteger(number)
    ? { number }
    : { email: text.toLowerCase() };
};
