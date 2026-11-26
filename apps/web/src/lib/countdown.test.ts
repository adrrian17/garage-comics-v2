import { describe, expect, it } from "vite-plus/test";

import { countdownTarget, timeLeft } from "./countdown";

const windows = {
  proposalsOpenAt: new Date("2027-01-10T12:00:00Z"),
  proposalsCloseAt: new Date("2027-02-10T12:00:00Z"),
  salesOpenAt: new Date("2027-03-10T12:00:00Z"),
  salesCloseAt: new Date("2027-03-20T12:00:00Z"),
};

describe(timeLeft, () => {
  it("splits the time left into days, hours, minutes and seconds", () => {
    expect(
      timeLeft(
        new Date("2027-02-10T12:00:00Z"),
        new Date("2027-02-07T07:47:52Z")
      )
    ).toStrictEqual({ days: 3, hours: 4, minutes: 12, seconds: 8 });
  });

  it("drops the milliseconds instead of rounding up", () => {
    expect(
      timeLeft(
        new Date("2027-02-10T12:00:00.000Z"),
        new Date("2027-02-10T11:59:58.500Z")
      )
    ).toStrictEqual({ days: 0, hours: 0, minutes: 0, seconds: 1 });
  });

  it("is null once the deadline has passed", () => {
    expect(
      timeLeft(
        new Date("2027-02-10T12:00:00Z"),
        new Date("2027-02-10T12:00:00Z")
      )
    ).toBeNull();
  });
});

describe(countdownTarget, () => {
  it("counts down to the close of proposals while they are open", () => {
    expect(countdownTarget({ ...windows, phase: "proposals" })).toStrictEqual({
      window: "proposals",
      deadline: windows.proposalsCloseAt,
    });
  });

  it("counts down to the close of sales while the Edition is on sale", () => {
    expect(countdownTarget({ ...windows, phase: "sales" })).toStrictEqual({
      window: "sales",
      deadline: windows.salesCloseAt,
    });
  });

  it.each(["upcoming", "preparation", "closed"] as const)(
    "has nothing to count down to while the Edition is %s",
    (phase) => {
      expect(countdownTarget({ ...windows, phase })).toBeNull();
    }
  );

  it("has nothing to count down to without an active Edition", () => {
    expect(countdownTarget(null)).toBeNull();
  });
});
