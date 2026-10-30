// ─── Einfarbige Icons für Design A ───────────────────────────────────────────
// Ersetzen die bunten Emojis. Ohne Hooks – nutzbar in Server- und Client-Komponenten.
// Alle Icons sind dekorativ (aria-hidden); die Bedeutung steht immer auch als Text daneben.

type IconProps = { className?: string }

export function IconBall({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.6l4.2 3-1.6 4.9H9.4l-1.6-4.9z" fill="currentColor" />
        <path d="M12 7.6V3.2M16.2 10.6l4.3-1.3M14.6 15.5l2.6 3.7M9.4 15.5l-2.6 3.7M7.8 10.6L3.5 9.3" />
      </g>
    </svg>
  )
}

export function IconTischtennis({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="currentColor" stroke="currentColor" strokeLinecap="round">
        <circle cx="13.5" cy="9.5" r="6.5" stroke="none" />
        <path d="M8.6 14.4L4 19" fill="none" strokeWidth="3.4" />
        <circle cx="19.6" cy="19.4" r="2" fill="none" strokeWidth="1.6" />
      </g>
    </svg>
  )
}

export function IconPin({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M12 21.5s-7-6.4-7-11.6a7 7 0 0 1 14 0c0 5.2-7 11.6-7 11.6z" />
        <circle cx="12" cy="9.9" r="2.4" />
      </g>
    </svg>
  )
}

export function IconPfeil({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function IconKalender({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  )
}

export function IconBurger({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M4 8h16M4 16h16" />
    </svg>
  )
}

export function IconSchliessen({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function IconPfeilUnten({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
