/** Auswahlknopf für Filterzeilen (Trainingszeiten, Mannschaften einer Sparte). */
export default function FilterChip({
  label,
  count,
  active,
  activeColor,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  activeColor: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs tracking-[0.08em] uppercase px-3 py-1.5 border transition-all duration-150"
      style={
        active
          ? { background: activeColor, borderColor: activeColor, color: '#f5f5f0' }
          : { background: 'transparent', borderColor: 'rgba(10,10,10,0.15)', color: '#0a0a0a' }
      }
    >
      {label}
      {count !== undefined && (
        <span
          className="text-[10px] opacity-70"
          style={active ? { color: 'rgba(245,245,240,0.7)' } : {}}
        >
          {count}
        </span>
      )}
    </button>
  )
}
