import { describe, expect, it } from "vitest";
import {
  calculateLedger,
  validatePayment,
  addMonths,
  daysBetween,
} from "../src/domain/ledger";
import type {
  Loan,
  Payment,
  RateChange,
  Adjustment,
} from "../src/domain/types";
it("uses id as the final strict chronology tie-breaker for equal-timestamp payments", () => {
  const selectedLoan = {
    ...loan,
    startDate: "2026-09-15",
    cycleStartDate: "2026-09-15",
    firstCycleEndDate: "2026-10-15",
  };
  const first = payment({
    id: "a",
    date: "2026-09-25",
    createdAt: "2026-09-25T12:00:00Z",
    totalCents: 1033333,
    principalCents: 1000000,
    interestCents: 33333,
    isPayoff: true,
  });
  const later = payment({
    id: "b",
    date: first.date,
    createdAt: first.createdAt,
    totalCents: 100,
    principalCents: 0,
    interestCents: 100,
  });
  expect(() =>
    validatePayment({
      loan: selectedLoan,
      payments: [later, first],
      rateChanges: [],
      adjustments: [],
      payment: first,
    }),
  ).not.toThrow();
  expect(() =>
    validatePayment({
      loan: selectedLoan,
      payments: [later, first],
      rateChanges: [],
      adjustments: [],
      payment: later,
    }),
  ).toThrow("ปิดหนี้");
});
const loan: Loan = {
  id: "loan",
  borrowerId: "person",
  source: "existing",
  principalCents: 1000000,
  openingInterestCents: 0,
  rateBps: 1000,
  startDate: "2026-10-15",
  cycleStartDate: "2026-10-15",
  firstCycleEndDate: "2026-11-15",
  anchorDay: 15,
  dueDate: "2026-11-15",
  notes: "",
  createdAt: "2026-10-15T00:00:00Z",
};
const payment = (overrides: Partial<Payment> = {}): Payment => ({
  id: "p",
  loanId: loan.id,
  date: "2026-10-25",
  totalCents: 400000,
  principalCents: 400000,
  interestCents: 0,
  note: "",
  createdAt: "2026-10-25T00:00:00Z",
  canceledAt: null,
  cancelReason: null,
  isPayoff: false,
  ...overrides,
});
const snapshot = (
  asOf: string,
  payments: Payment[] = [],
  changes: RateChange[] = [],
  adjustments: Adjustment[] = [],
  selectedLoan = loan,
) =>
  calculateLedger({
    loan: selectedLoan,
    payments,
    rateChanges: changes,
    adjustments,
    asOf,
  });
describe("loan ledger", () => {
  it("uses the opening principal until the next cycle after a partial repayment", () => {
    expect(snapshot("2026-11-15", [payment()]).interestCents).toBe(100000);
    expect(snapshot("2026-12-15", [payment()]).interestCents).toBe(160000);
  });
});
it("stops accrual at the actual-day payoff and resumes when that payoff is canceled", () => {
  const payoff = payment({
    date: "2026-10-25",
    principalCents: 1000000,
    interestCents: 32258,
    totalCents: 1032258,
    isPayoff: true,
  });
  expect(snapshot("2026-10-25").payoffTotalCents).toBe(1032258);
  expect(snapshot("2026-12-15", [payoff])).toMatchObject({
    principalCents: 0,
    interestCents: 0,
    accruedInterestCents: 0,
    closed: true,
  });
  expect(
    snapshot("2026-12-15", [
      { ...payoff, canceledAt: "2026-10-26", cancelReason: "ผิด" },
    ]).interestCents,
  ).toBe(200000);
});
it("replays adjustments with their dates and ignores canceled and unrelated entries", () => {
  const adjust: Adjustment = {
    id: "a",
    loanId: "loan",
    date: "2026-10-26",
    principalDeltaCents: -200000,
    interestDeltaCents: 5000,
    reason: "แก้ยอด",
    createdAt: "2026-10-26",
    canceledAt: null,
    cancelReason: null,
  };
  expect(snapshot("2026-12-15", [], [], [adjust])).toMatchObject({
    principalCents: 800000,
    interestCents: 185000,
  });
  expect(
    snapshot("2026-12-15", [], [], [{ ...adjust, canceledAt: "2026-10-27" }]),
  ).toMatchObject({ principalCents: 1000000, interestCents: 200000 });
  expect(
    snapshot(
      "2026-12-15",
      [payment({ loanId: "other" })],
      [],
      [{ ...adjust, loanId: "other" }],
    ).principalCents,
  ).toBe(1000000);
});
it("credits interest paid during the current cycle without negative displayed arrears", () => {
  const earlyInterest = payment({
    date: "2026-10-25",
    principalCents: 0,
    interestCents: 30000,
    totalCents: 30000,
  });
  expect(snapshot("2026-10-25", [earlyInterest])).toMatchObject({
    principalCents: 1000000,
    interestCents: 0,
    accruedInterestCents: 2258,
    payoffInterestCents: 2258,
  });
  expect(snapshot("2026-11-15", [earlyInterest]).interestCents).toBe(70000);
});
it("imports only the remaining fraction of a cycle and preserves a 31-day anchor", () => {
  const imported = {
    ...loan,
    startDate: "2026-10-25",
    openingInterestCents: 25000,
  };
  expect(snapshot("2026-11-15", [], [], [], imported).interestCents).toBe(
    92742,
  );
  const monthEnd = {
    ...loan,
    startDate: "2028-01-31",
    cycleStartDate: "2028-01-31",
    firstCycleEndDate: "2028-02-29",
    anchorDay: 31,
  };
  expect(snapshot("2028-02-29", [], [], [], monthEnd)).toMatchObject({
    interestCents: 100000,
    currentCycleEndDate: "2028-03-31",
  });
});
it("uses rates from the effective cycle and charges no interest on zero-rate loans", () => {
  const change: RateChange = {
    id: "rate",
    loanId: loan.id,
    effectiveDate: "2026-11-15",
    rateBps: 750,
    reason: "ตกลงใหม่",
    createdAt: "2026-10-16",
  };
  expect(snapshot("2026-12-15", [], [change])).toMatchObject({
    interestCents: 175000,
    currentRateBps: 750,
  });
  expect(
    snapshot("2026-12-15", [], [], [], { ...loan, rateBps: 0 }),
  ).toMatchObject({ interestCents: 0, payoffTotalCents: 1000000 });
});

it("validates allocation and prevents same-day and accrued-interest overpayment", () => {
  const selectedLoan = {
    ...loan,
    startDate: "2026-09-15",
    cycleStartDate: "2026-09-15",
    firstCycleEndDate: "2026-10-15",
  };
  const validate = (candidate: Payment, existing: Payment[] = []) =>
    validatePayment({
      loan: selectedLoan,
      payments: existing,
      rateChanges: [],
      adjustments: [],
      payment: candidate,
    });
  expect(() =>
    validate(payment({ date: "2026-09-15", totalCents: 1, principalCents: 0 })),
  ).toThrow();
  expect(() =>
    validate(
      payment({ date: "2026-09-15", totalCents: -1, principalCents: -1 }),
    ),
  ).toThrow();
  expect(() =>
    validate(
      payment({
        date: "2026-09-15",
        totalCents: 1000001,
        principalCents: 1000001,
      }),
    ),
  ).toThrow();
  expect(() =>
    validate(
      payment({
        date: "2026-09-15",
        totalCents: 100,
        principalCents: 0,
        interestCents: 100,
      }),
    ),
  ).toThrow();
  const first = payment({
    id: "first",
    date: "2026-09-15",
    createdAt: "2026-09-15T01:00:00Z",
    totalCents: 700000,
    principalCents: 700000,
  });
  expect(() =>
    validate(
      payment({
        id: "second",
        date: "2026-09-15",
        createdAt: "2026-09-15T02:00:00Z",
      }),
      [first],
    ),
  ).toThrow();
});
it("accepts a payment of accrued interest and exact payoff, rejects an incorrect payoff", () => {
  const selected = {
    ...loan,
    startDate: "2026-09-15",
    cycleStartDate: "2026-09-15",
    firstCycleEndDate: "2026-10-15",
  };
  const validate = (p: Payment) =>
    validatePayment({
      loan: selected,
      payments: [],
      rateChanges: [],
      adjustments: [],
      payment: p,
    });
  const accruedPayment = payment({
    date: "2026-09-25",
    principalCents: 0,
    interestCents: 33333,
    totalCents: 33333,
  });
  expect(() => validate(accruedPayment)).not.toThrow();
  const payoff = {
    ...accruedPayment,
    principalCents: 1000000,
    totalCents: 1033333,
    isPayoff: true,
  };
  expect(() => validate(payoff)).not.toThrow();
  expect(() =>
    validate({ ...payoff, interestCents: 33332, totalCents: 1033332 }),
  ).toThrow();
});
it("stops interest when the last principal is returned even if interest remains unpaid", () => {
  const finalPrincipal = payment({
    date: "2026-10-25",
    totalCents: 1000000,
    principalCents: 1000000,
  });
  expect(snapshot("2026-12-15", [finalPrincipal])).toMatchObject({
    principalCents: 0,
    interestCents: 32258,
    accruedInterestCents: 0,
    closed: false,
  });
  const lastInterest = payment({
    id: "last",
    date: "2026-11-01",
    createdAt: "2026-11-01",
    totalCents: 32258,
    principalCents: 0,
    interestCents: 32258,
    isPayoff: true,
  });
  expect(snapshot("2026-12-15", [finalPrincipal, lastInterest])).toMatchObject({
    principalCents: 0,
    interestCents: 0,
    accruedInterestCents: 0,
    closed: true,
  });
});
it("uses an effective rate at the initial cycle boundary", () => {
  const change: RateChange = {
    id: "first-rate",
    loanId: loan.id,
    effectiveDate: loan.cycleStartDate,
    rateBps: 700,
    reason: "แก้อัตรา",
    createdAt: "2026-10-15",
  };
  expect(snapshot("2026-11-15", [], [change]).interestCents).toBe(70000);
});

it("rejects invalid dates and unsafe cycle parameters instead of computing an invalid ledger", () => {
  expect(() => daysBetween("2026-02-30", "2026-03-01")).toThrow("วันที่");
  expect(() => addMonths("2026-01-31", 1, 32)).toThrow();
  expect(() => addMonths("2026-01-31", 1.5)).toThrow();
  expect(() =>
    snapshot("2026-11-15", [], [], [], {
      ...loan,
      firstCycleEndDate: loan.startDate,
    }),
  ).toThrow();
  expect(() =>
    snapshot("2026-11-15", [], [], [], {
      ...loan,
      principalCents: Number.MAX_SAFE_INTEGER + 1,
    }),
  ).toThrow();
});
it("rejects resulting balances outside safe integer money precision", () => {
  expect(() =>
    snapshot("2026-11-15", [], [], [], {
      ...loan,
      principalCents: Number.MAX_SAFE_INTEGER,
    }),
  ).toThrow("ยอด");
});
it("counts same-boundary principal repayments in the new cycle and respects earlier same-day entries", () => {
  const atBoundary = payment({ date: "2026-11-15" });
  expect(snapshot("2026-12-15", [atBoundary]).interestCents).toBe(160000);
  const selectedLoan = {
    ...loan,
    startDate: "2026-09-15",
    cycleStartDate: "2026-09-15",
    firstCycleEndDate: "2026-10-15",
  };
  const first = payment({
    id: "first",
    date: "2026-09-25",
    createdAt: "2026-09-25T01:00:00Z",
    principalCents: 700000,
    totalCents: 700000,
  });
  const second = payment({
    id: "second",
    date: "2026-09-25",
    createdAt: "2026-09-25T02:00:00Z",
  });
  expect(() =>
    validatePayment({
      loan: selectedLoan,
      payments: [first],
      rateChanges: [],
      adjustments: [],
      payment: second,
    }),
  ).toThrow("เกินเงินต้น");
});
it("projects next cycle interest using its scheduled rate while preserving the current rate", () => {
  const change: RateChange = {
    id: "next",
    loanId: loan.id,
    effectiveDate: "2026-11-15",
    rateBps: 700,
    reason: "ลดดอก",
    createdAt: "2026-10-16",
  };
  expect(snapshot("2026-10-25", [payment()], [change])).toMatchObject({
    currentRateBps: 1000,
    nextCycleInterestCents: 42000,
  });
});
it("rounds a half satang upward and keeps interest-only payment from reducing principal", () => {
  expect(
    snapshot("2026-11-15", [], [], [], {
      ...loan,
      principalCents: 1,
      rateBps: 5000,
    }).interestCents,
  ).toBe(1);
  const paid = payment({
    date: "2026-11-15",
    totalCents: 100000,
    principalCents: 0,
    interestCents: 100000,
  });
  expect(snapshot("2026-12-15", [paid])).toMatchObject({
    principalCents: 1000000,
    interestCents: 100000,
    interestPaidCents: 100000,
    principalPaidCents: 0,
  });
});
it("rejects unsafe money, future payments, pre-opening payments and excess interest with useful errors", () => {
  const selectedLoan = {
    ...loan,
    startDate: "2026-09-15",
    cycleStartDate: "2026-09-15",
    firstCycleEndDate: "2026-10-15",
  };
  const validate = (p: Payment) =>
    validatePayment({
      loan: selectedLoan,
      payments: [],
      rateChanges: [],
      adjustments: [],
      payment: p,
    });
  expect(() => validate(payment({ date: "2099-01-01" }))).toThrow("ล่วงหน้า");
  expect(() => validate(payment({ date: "2026-09-14" }))).toThrow("ก่อนวัน");
  expect(() =>
    validate(
      payment({ date: "2026-09-25", totalCents: Number.MAX_SAFE_INTEGER + 1 }),
    ),
  ).toThrow("สตางค์");
  expect(() =>
    validate(
      payment({
        date: "2026-09-25",
        totalCents: 33334,
        principalCents: 0,
        interestCents: 33334,
      }),
    ),
  ).toThrow("เกินดอก");
  expect(() =>
    validate(
      payment({ date: "2026-09-25", totalCents: 100, principalCents: 99 }),
    ),
  ).toThrow("ยอดรับจริง");
  expect(() =>
    validate(
      payment({ date: "2026-09-25", totalCents: -1, principalCents: -1 }),
    ),
  ).toThrow("สตางค์");
});
