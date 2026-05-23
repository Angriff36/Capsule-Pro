export function isInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

export function subtractYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() - years);
  return d;
}

export function startOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3, 1);
}

export function endOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
}

export function formatDateShort(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatMonthYear(date: Date): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatMonthShort(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function getQuarterLabel(date: Date): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
}

export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round(Math.abs(b.getTime() - a.getTime()) / msPerDay);
}

export function getMonthsInRange(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const current = startOfMonth(new Date(start));
  const last = startOfMonth(new Date(end));
  while (current <= last) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

export function getWeeksInRange(start: Date, end: Date): Array<{ start: Date; end: Date }> {
  const weeks: Array<{ start: Date; end: Date }> = [];
  const current = new Date(start);
  while (current <= end) {
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weeks.push({
      start: new Date(current),
      end: weekEnd > end ? new Date(end) : weekEnd,
    });
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}
