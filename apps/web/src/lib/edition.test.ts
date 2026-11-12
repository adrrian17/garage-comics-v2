import { describe, expect, it } from "vite-plus/test";

import { editionInput, editionPhase } from "./edition";

const windows = {
  proposalsOpenAt: new Date("2027-01-10T12:00:00Z"),
  proposalsCloseAt: new Date("2027-02-10T12:00:00Z"),
  salesOpenAt: new Date("2027-03-10T12:00:00Z"),
  salesCloseAt: new Date("2027-03-20T12:00:00Z"),
};

const at = (iso: string) => new Date(iso);

describe(editionPhase, () => {
  it.each([
    ["2027-01-01T00:00:00Z", "upcoming"],
    ["2027-01-10T12:00:00Z", "proposals"],
    ["2027-02-01T00:00:00Z", "proposals"],
    ["2027-02-10T12:00:00Z", "preparation"],
    ["2027-03-01T00:00:00Z", "preparation"],
    ["2027-03-10T12:00:00Z", "sales"],
    ["2027-03-15T00:00:00Z", "sales"],
    ["2027-03-20T12:00:00Z", "closed"],
    ["2028-01-01T00:00:00Z", "closed"],
  ])("at %s the Edition is %s", (now, phase) => {
    expect(editionPhase(windows, at(now))).toBe(phase);
  });

  it("goes straight from proposals to sales when there is no preparation time", () => {
    const back = { ...windows, salesOpenAt: windows.proposalsCloseAt };

    expect(editionPhase(back, windows.proposalsCloseAt)).toBe("sales");
  });
});

describe("the Edition form", () => {
  const form = {
    name: "Edición 2027",
    proposalsOpenAt: "2027-01-10T09:00",
    proposalsCloseAt: "2027-02-10T09:00",
    salesOpenAt: "2027-03-10T09:00",
    salesCloseAt: "2027-03-20T09:00",
    registrationPriceMxn: "500",
  };

  it("reads form dates as Mexico City time", () => {
    const parsed = editionInput.parse(form);

    expect(parsed.proposalsOpenAt).toStrictEqual(at("2027-01-10T15:00:00Z"));
    expect(parsed.registrationPriceMxn).toBe(500);
  });

  it("refuses a day that does not exist instead of rolling it into the next month", () => {
    const result = editionInput.safeParse({
      ...form,
      proposalsCloseAt: "2027-02-30T09:00",
    });

    expect(result.success).toBeFalsy();
  });

  it("refuses dates out of order", () => {
    const result = editionInput.safeParse({
      ...form,
      salesOpenAt: "2027-02-01T09:00",
    });

    expect(result.success).toBeFalsy();
  });

  it("refuses a Registration price in cents", () => {
    const result = editionInput.safeParse({
      ...form,
      registrationPriceMxn: "499.5",
    });

    expect(result.success).toBeFalsy();
  });
});
