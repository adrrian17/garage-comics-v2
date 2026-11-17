/** The readable Order Number a Customer sees, such as GRG-1000. The database stores only the integer. */
export const formatOrderNumber = (number: number) => `GRG-${number}`;

export type OrderSearch = { number: number } | { email: string };

/** The longest valid email, and so the longest search worth running. */
export const ORDER_SEARCH_MAX_LENGTH = 254;

const ORDER_NUMBER_INPUT = /^(?:grg[\s-]?)?(?<number>\d+)$/iu;

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
