export function getMonday(dateInput?: string | Date): Date {
  const date = dateInput ? new Date(dateInput) : new Date()
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

export function isoDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getWeekDates(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, index) => isoDate(addDays(monday, index)))
}
