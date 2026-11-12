// Garage Cómics runs on Mexico City time, on the server and in every browser.
const TIME_ZONE = "America/Mexico_City";

// 24-hour time: the 12-hour "p.m." ends in a period that doubles up at the end of a sentence.
const dateTimeFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "long",
  timeStyle: "short",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

const shortDateTimeFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

const dateFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "long",
  timeZone: TIME_ZONE,
});

const mxnFormat = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export const formatDateTime = (date: Date) => dateTimeFormat.format(date);

export const formatShortDateTime = (date: Date) =>
  shortDateTimeFormat.format(date);

export const formatDate = (date: Date) => dateFormat.format(date);

export const formatMxn = (pesos: number) => mxnFormat.format(pesos);
