import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { calculateLedger } from '../server-dist/src/domain/ledger.js';
import { calculateInterestForecast } from '../server-dist/src/domain/forecast.js';
import { referenceLedger } from '../tests/reference-ledger.ts';

const asOf = process.argv[2];
if (!asOf || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error('Usage: node scripts/audit-ledger.mjs YYYY-MM-DD');
const db = new DatabaseSync(resolve('.data/loans.sqlite'), { readOnly: true });
const raw = db.prepare("SELECT json FROM state WHERE key='ledger'").get()?.json;
if (typeof raw !== 'string') throw new Error('Missing ledger');
const data = JSON.parse(raw);
const nextMonth = new Date(`${asOf.slice(0,7)}-01T00:00:00Z`);
nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
const endBoundary = nextMonth.toISOString().slice(0,10);
const monthStart = `${asOf.slice(0,7)}-01`;
const rows = [];
const failures = [];
for (const loan of data.loans) {
  const input = { loan, payments: data.payments, adjustments: data.adjustments, rateChanges: data.rateChanges, asOf };
  const actual = calculateLedger(input), expected = referenceLedger(input);
  for (const [field, value] of Object.entries(expected)) if (actual[field] !== value)
    failures.push({ loanId: loan.id, field, actual: actual[field], expected: value });
  const forecast = calculateInterestForecast(input);
  const baseline = referenceLedger({ ...input, asOf: monthStart < loan.startDate ? loan.startDate : monthStart });
  const projected = referenceLedger({ ...input,
    payments: input.payments.filter(p => p.date <= asOf), adjustments: input.adjustments.filter(a => a.date <= asOf), asOf: endBoundary });
  const expectedMonth = projected.earnedInterestCents - baseline.earnedInterestCents;
  if (forecast.month.forecastInterestCents !== expectedMonth)
    failures.push({ loanId: loan.id, field: 'monthForecast', actual: forecast.month.forecastInterestCents, expected: expectedMonth });
  rows.push({ loanId: loan.id, borrowerId: loan.borrowerId, borrower: data.borrowers.find(b => b.id === loan.borrowerId)?.name,
    ...expected, cycleEarnedCents: forecast.cycle.earnedInterestCents,
    fullCycleInterestCents: forecast.cycle.accruing ? forecast.cycle.fullInterestCents : 0,
    monthForecastCents: forecast.month.forecastInterestCents, rateBps: actual.currentRateBps,
    cycleStart: forecast.cycle.chargeStartDate, cycleEnd: forecast.cycle.endDate,
    elapsedDays: forecast.cycle.elapsedDays, fullDays: forecast.cycle.fullDays });
}
const unchanged = db.prepare("SELECT json FROM state WHERE key='ledger'").get()?.json === raw;
db.close();
const totals = rows.reduce((sum, row) => ({ principalCents: sum.principalCents + row.principalCents,
  earnedInterestCents: sum.earnedInterestCents + row.earnedInterestCents,
  payableInterestCents: sum.payableInterestCents + row.payoffInterestCents,
  fullCycleInterestCents: sum.fullCycleInterestCents + row.fullCycleInterestCents,
  monthForecastCents: sum.monthForecastCents + row.monthForecastCents }),
  { principalCents: 0, earnedInterestCents: 0, payableInterestCents: 0, fullCycleInterestCents: 0, monthForecastCents: 0 });
const report = { asOf, checkedAt: new Date().toISOString(), borrowers: data.borrowers.length, loans: rows.length,
  events: { payments: data.payments.length, adjustments: data.adjustments.length, rateChanges: data.rateChanges.length },
  dataUnchanged: unchanged, ledgerSha256: createHash('sha256').update(raw).digest('hex'), totals, failures, rows };
const outDir = resolve('.data/audits');
mkdirSync(outDir, { recursive: true });
const output = join(outDir, `ledger-${asOf}.json`);
writeFileSync(output, JSON.stringify(report, null, 2));
const people = new Map();
for (const row of rows) {
  const person = people.get(row.borrowerId) ?? { name: row.borrower, loans: 0,
    principal: 0, earned: 0, payable: 0, currentCycle: 0, full: 0, forecast: 0 };
  person.loans++;
  person.principal += row.principalCents;
  person.earned += row.earnedInterestCents;
  person.payable += row.payoffInterestCents;
  person.currentCycle += row.cycleEarnedCents;
  person.full += row.fullCycleInterestCents;
  person.forecast += row.monthForecastCents;
  people.set(row.borrowerId, person);
}
const money = value => new Intl.NumberFormat('th-TH', {minimumFractionDigits:2,maximumFractionDigits:2}).format(value/100);
const reportText = [
  `# ผลตรวจยอดเงิน ณ ${asOf}`,
  '',
  `ตรวจ ${rows.length} รายการกู้ ของ ${people.size} คน เทียบกับเครื่องคำนวณอิสระ: ${failures.length ? 'พบความคลาดเคลื่อน ' + failures.length + ' จุด' : 'ยอดตรงกันทุกสตางค์'}`,
  `อ่านฐานข้อมูลอย่างเดียว ข้อมูลไม่เปลี่ยน: ${unchanged ? 'ยืนยันแล้ว' : 'ข้อมูลเปลี่ยนระหว่างตรวจ ต้องตรวจใหม่'}`,
  '',
  '| ผู้กู้ | รายการ | ต้นคงเหลือ | ดอกเกิดตั้งแต่เริ่มบันทึก | ดอกที่ยังต้องชำระ | ดอกเต็มรอบ | คาดการณ์สิ้นเดือน |',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...[...people.values()].map(p => `| ${p.name.replace(/\|/g, '\\|')} | ${p.loans} | ${money(p.principal)} | ${money(p.earned)} | ${money(p.payable)} | ${money(p.full)} | ${money(p.forecast)} |`),
  `| รวม | ${rows.length} | ${money(totals.principalCents)} | ${money(totals.earnedInterestCents)} | ${money(totals.payableInterestCents)} | ${money(totals.fullCycleInterestCents)} | ${money(totals.monthForecastCents)} |`,
  '',
  'ดอกถึงวันนี้ในบัตรรายคนของแอปแสดงเฉพาะรอบปัจจุบัน ส่วนตารางนี้รวมดอกตั้งแต่วันเริ่มบันทึก การตัดรอบจะย้ายดอกของรอบที่จบไปเป็นดอกค้าง ไม่ได้ลบยอดดอกนั้นออกจากยอดที่ต้องชำระ',
  '',
  ...[...people.values()].filter(p => p.earned !== p.currentCycle).map(p => `- ${p.name}: ดอกเกิดตั้งแต่เริ่มบันทึก ${money(p.earned)} บาท แต่รอบปัจจุบัน ${money(p.currentCycle)} บาท ส่วนที่จบรอบแล้วอยู่ในยอดดอกค้าง`),
  '',
  'ใช้จำนวนวันจริงในรอบ นับวันเริ่ม ไม่รวมวันตรวจ ปัดเป็นสตางค์แยกแต่ละงวด หนี้ยกมานับเฉพาะวันเริ่มบันทึกเป็นต้นไป ดอกยกมาและรายการปรับดอกไม่ใช่ดอกที่เกิดจากการคำนวณใหม่ คาดการณ์สิ้นเดือนรวมวันสุดท้ายของเดือน ไม่ถือเป็นเงินรับแล้ว และสมมติว่าไม่มีรับคืนต้นหรือปรับยอดเพิ่ม',
  '',
  `ประวัติที่ตรวจ: รับชำระ ${data.payments.length}, ปรับปรุง ${data.adjustments.length}, เปลี่ยนอัตรา ${data.rateChanges.length} รายการ`,
  '',
];
writeFileSync(join(outDir, `ledger-${asOf}.md`), reportText.join('\n'));
console.log(JSON.stringify({ ...report, rows: undefined, ledgerSha256: undefined, output }, null, 2));
if (failures.length || !unchanged) process.exitCode = 1;
