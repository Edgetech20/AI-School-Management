export function formatToIST(value: string | null) {
  if (!value) return "-";

  const normalized = value.replace(" ", "T");
  const hasZone = /Z$|[+-]\d{2}:\d{2}$/.test(normalized);

  if (!hasZone) {
    const [datePart, timePart = ""] = normalized.split("T");
    return `${datePart} ${timePart.slice(0, 8)} IST`.trim();
  }

  const date = new Date(normalized);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}
