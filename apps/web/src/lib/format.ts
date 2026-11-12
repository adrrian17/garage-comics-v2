// Garage Cómics runs on Mexico City time, on the server and in every browser.
const TIME_ZONE = "America/Mexico_City";

const dateTimeFormat = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "long",
  timeStyle: "short",
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

export const formatDate = (date: Date) => dateFormat.format(date);

export const formatMxn = (pesos: number) => mxnFormat.format(pesos);
