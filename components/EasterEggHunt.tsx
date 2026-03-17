'use client'

import { type MouseEvent, useMemo, useState } from 'react'

type ChickPop = {
  id: number
  x: number
  y: number
}

type EggSpot = {
  id: string
  top: string
  left: string
}

const fieldEggSpots: EggSpot[] = [
  { id: 'field-1', top: '11%', left: '7%' },
  { id: 'field-2', top: '17%', left: '78%' },
  { id: 'field-3', top: '29%', left: '23%' },
  { id: 'field-4', top: '33%', left: '91%' },
  { id: 'field-5', top: '47%', left: '12%' },
  { id: 'field-6', top: '56%', left: '73%' },
  { id: 'field-7', top: '69%', left: '27%' },
  { id: 'field-8', top: '83%', left: '86%' },
]

const foldoutSpots: EggSpot[] = [
  { id: 'foldout-1', top: '26%', left: '4%' },
  { id: 'foldout-2', top: '52%', left: '86%' },
  { id: 'foldout-3', top: '74%', left: '6%' },
]

const eggColors = ['#f7c4d9', '#c7e6ff', '#fde38a', '#c8f7c5', '#e2ccff']

export default function EasterEggHunt() {
  const [pops, setPops] = useState<ChickPop[]>([])
  const [foundEggIds, setFoundEggIds] = useState<Set<string>>(new Set())

  const eggs = useMemo(
    () =>
      fieldEggSpots.map((pos, index) => ({
        ...pos,
        color: eggColors[index % eggColors.length],
        rotate: index % 2 === 0 ? '-10deg' : '8deg',
      })),
    []
  )

  const foldoutEggs = useMemo(
    () =>
      foldoutSpots.map((pos, index) => ({
        ...pos,
        color: eggColors[(index + 2) % eggColors.length],
        rotate: index % 2 === 0 ? '12deg' : '-7deg',
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

  function handleEggClick(eggId: string, event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    spawnChick(rect.left + rect.width / 2, rect.top - 8)

    setFoundEggIds((prev) => {
      const next = new Set(prev)
      next.add(eggId)
      return next
    })
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-40">
        {eggs.map((egg, index) => (
          foundEggIds.has(egg.id) ? null : (
          <button
            key={egg.id}
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
            onClick={(event) => handleEggClick(egg.id, event)}
          >
            <span className="egg-stripe" />
            <span className="egg-stripe second" />
          </button>
          )
        ))}

        {foldoutEggs.map((egg, index) => (
          <details
            key={`${egg.id}-spot`}
            className="egg-cache pointer-events-auto absolute"
            style={{ top: egg.top, left: egg.left }}
          >
            <summary aria-label="Aufklappbares Versteck">🪺</summary>

            {!foundEggIds.has(egg.id) ? (
              <button
                type="button"
                aria-label="Verstecktes Osterei im aufklappbaren Versteck"
                className="easter-egg"
                style={{
                  backgroundColor: egg.color,
                  ['--egg-rotate' as string]: egg.rotate,
                  animationDelay: `${(index + 1) * 0.25}s`,
                }}
                onClick={(event) => handleEggClick(egg.id, event)}
              >
                <span className="egg-stripe" />
                <span className="egg-stripe second" />
              </button>
            ) : (
              <div className="egg-cache-empty">Schon gefunden ✓</div>
            )}
          </details>
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
