'use client'

/**
 * Sanity Studio – eingebettet in die Next.js-App unter /studio
 * Zugang: http://localhost:3000/studio
 */
import { NextStudio } from 'next-sanity/studio'
import config from '@/sanity.config'

export const dynamic = 'force-dynamic'

export default function StudioPage() {
  return <NextStudio config={config} />
}
