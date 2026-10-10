import { addMonths, calculateLedger, daysBetween } from "./ledger.js";
import type { Adjustment, InterestForecast, Loan, Payment, RateChange } from "./types.js";

/** Calendar projections assume no further payments/adjustments; scheduled rates still apply. */
export function calculateInterestForecast(input: {
  loan: Loan; payments: Payment[]; rateChanges: RateChange[];
  adjustments: Adjustment[]; asOf: string;
}): InterestForecast {
  const { asOf, loan } = input;
  const confirmed = {
    ...input,
    payments: input.payments.filter((payment) => payment.date <= asOf),
    adjustments: input.adjustments.filter((adjustment) => adjustment.date <= asOf),
  };
  const current = calculateLedger(confirmed);
  const monthStart = `${asOf.slice(0, 7)}-01`;
  const nextMonth = addMonths(monthStart, 1, 1);
  const end = new Date(`${nextMonth}T00:00:00Z`);
  end.setUTCDate(0);
  const baselineDate = monthStart < loan.startDate ? loan.startDate : monthStart;
  const baseline = baselineDate === asOf ? current : calculateLedger({ ...confirmed, asOf: baselineDate });
  // The exclusive boundary includes the last calendar day, unlike the current-day snapshot.
  const projected = calculateLedger({ ...confirmed, asOf: nextMonth });
  const earned = current.earnedInterestCents - baseline.earnedInterestCents;
  const additional = projected.earnedInterestCents - current.earnedInterestCents;
  if (daysBetween(asOf, nextMonth) <= 0 || !Number.isSafeInteger(earned + additional))
    throw new Error("ช่วงคาดการณ์หรือยอดดอกไม่ถูกต้อง");
  return {
    cycle: current.cycleInterest,
    month: {
      startDate: monthStart, endDate: end.toISOString().slice(0, 10),
      earnedInterestCents: earned, additionalInterestCents: additional,
      forecastInterestCents: earned + additional,
    },
  };
}
