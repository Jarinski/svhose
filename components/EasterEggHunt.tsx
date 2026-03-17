'use client'

import { useMemo, useState } from 'react'

type ChickPop = {
  id: number
  x: number
  y: number
}

const eggPositions = [
  { top: '16%', left: '6%' },
  { top: '24%', left: '88%' },
  { top: '36%', left: '14%' },
  { top: '42%', left: '84%' },
  { top: '58%', left: '8%' },
  { top: '66%', left: '90%' },
  { top: '78%', left: '18%' },
  { top: '84%', left: '82%' },
]

const eggColors = ['#f7c4d9', '#c7e6ff', '#fde38a', '#c8f7c5', '#e2ccff']

export default function EasterEggHunt() {
  const [pops, setPops] = useState<ChickPop[]>([])

  const eggs = useMemo(
    () =>
      eggPositions.map((pos, index) => ({
        ...pos,
        color: eggColors[index % eggColors.length],
        rotate: index % 2 === 0 ? '-10deg' : '8deg',
      })),
    []
  )

  function spawnChick(x: number, y: number) {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setPops((prev) => [...prev, { id, x, y }])

    window.setTimeout(() => {
      setPops((prev) => prev.filter((pop) => pop.id !== id))
    }, 1400)
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-40">
        {eggs.map((egg, index) => (
          <button
            key={`${egg.top}-${egg.left}`}
            type="button"
            aria-label="Verstecktes Osterei"
            className="easter-egg pointer-events-auto absolute"
            style={{
              top: egg.top,
              left: egg.left,
              backgroundColor: egg.color,
              ['--egg-rotate' as string]: egg.rotate,
              animationDelay: `${index * 0.2}s`,
            }}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              spawnChick(rect.left + rect.width / 2, rect.top - 8)
            }}
          >
            <span className="egg-stripe" />
            <span className="egg-stripe second" />
          </button>
        ))}
      </div>

      <div className="pointer-events-none fixed inset-0 z-[60]">
        {pops.map((pop) => (
          <div
            key={pop.id}
            className="chick-pop"
            style={{ left: pop.x, top: pop.y }}
          >
            🐥
          </div>
        ))}
      </div>
    </>
  )
}
