// RFC 5545 ICS generation — no external dependency.

function foldLine(line: string): string {
  // RFC 5545 §3.1: fold lines longer than 75 octets
  const MAX = 75;
  if (line.length <= MAX) return line;
  const parts: string[] = [];
  parts.push(line.slice(0, MAX));
  let i = MAX;
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + MAX - 1));
    i += MAX - 1;
  }
  return parts.join("\r\n");
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export interface ICSOptions {
  uid: string;
  summary: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  organizerEmail: string;
  organizerName: string;
  attendees: { email: string; name: string }[];
}

export function generateICS(opts: ICSOptions): string {
  const stamp = icsDate(new Date());
  const start = icsDate(opts.start);
  const end = icsDate(opts.end);

  const attendeeLines = opts.attendees
    .map((a) => foldLine(`ATTENDEE;CN=${escapeText(a.name)};RSVP=TRUE:mailto:${a.email}`))
    .join("\r\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LearnFast//Coach Roster//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    foldLine(`UID:${opts.uid}@learnfastapp.com`),
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    foldLine(`SUMMARY:${escapeText(opts.summary)}`),
    foldLine(`DESCRIPTION:${escapeText(opts.description)}`),
    foldLine(`LOCATION:${escapeText(opts.location)}`),
    foldLine(`ORGANIZER;CN=${escapeText(opts.organizerName)}:mailto:${opts.organizerEmail}`),
    attendeeLines,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

export function generateCancelICS(opts: Omit<ICSOptions, "description" | "location">): string {
  const stamp = icsDate(new Date());
  const start = icsDate(opts.start);
  const end = icsDate(opts.end);

  const attendeeLines = opts.attendees
    .map((a) => foldLine(`ATTENDEE;CN=${escapeText(a.name)};RSVP=TRUE:mailto:${a.email}`))
    .join("\r\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LearnFast//Coach Roster//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:CANCEL",
    "BEGIN:VEVENT",
    foldLine(`UID:${opts.uid}@learnfastapp.com`),
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    foldLine(`SUMMARY:CANCELLED: ${escapeText(opts.summary)}`),
    foldLine(`ORGANIZER;CN=${escapeText(opts.organizerName)}:mailto:${opts.organizerEmail}`),
    attendeeLines,
    "STATUS:CANCELLED",
    "SEQUENCE:1",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}
