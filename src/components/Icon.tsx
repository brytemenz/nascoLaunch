// Minimal stroke icon set (SF Symbols–like).
const paths: Record<string, string> = {
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  check: "m5 12.5 4.5 4.5L19 7",
  bag: "M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2",
  send: "M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3Z",
  users: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 9v-1a4 4 0 0 0-3-3.9M16 3.1a3.5 3.5 0 0 1 0 6.8",
  menu: "M4 6h16M4 12h16M4 18h10",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.9a7.5 7.5 0 0 0-2-1.2L14.5 3h-4l-.4 2.5a7.5 7.5 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-.9a7.5 7.5 0 0 0 2 1.2l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  grid: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2",
  logout: "M15 17l5-5-5-5M20 12H9M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7",
  trash: "M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3",
  edit: "M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4",
  whatsapp: "M3 21l1.7-5A8.5 8.5 0 1 1 8 19.4L3 21Z",
  sms: "M4 5h16v11H8l-4 4V5Z",
  x: "M6 6l12 12M18 6 6 18",
  refresh: "M20 11a8 8 0 0 0-14.9-3.9M4 4v4h4M4 13a8 8 0 0 0 14.9 3.9M20 20v-4h-4",
  arrow: "M5 12h14M13 6l6 6-6 6",
  power: "M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0",
  share: "M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  copy: "M9 9h10v12H9V9Zm-4 6V3h10",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
};

export type IconName = keyof typeof paths;

export function Icon({ name, className = "h-5 w-5", strokeWidth = 1.8 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name]} />
    </svg>
  );
}
