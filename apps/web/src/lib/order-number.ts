/** The readable Order Number a Customer sees, such as GRG-1000. The database stores only the integer. */
export const formatOrderNumber = (number: number) => `GRG-${number}`;
