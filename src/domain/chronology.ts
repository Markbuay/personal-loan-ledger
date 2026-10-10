type DatedEvent = { date: string; createdAt: string; id: string };

/** Stable business ordering, including legacy records with identical timestamps. */
export function compareEvents(a: DatedEvent, b: DatedEvent): number {
  return (
    a.date.localeCompare(b.date) ||
    a.createdAt.localeCompare(b.createdAt) ||
    a.id.localeCompare(b.id)
  );
}
