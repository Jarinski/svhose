import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const contentDir = path.join(process.cwd(), 'content')
const newsDir = path.join(contentDir, 'news')

export interface NewsPost {
  slug: string
  title: string
  date: string
  category: string
  sparte: string
  image?: string
  excerpt: string
  content: string
}

export function getAllNews(): NewsPost[] {
  if (!fs.existsSync(newsDir)) return []
  
  const files = fs.readdirSync(newsDir).filter(f => f.endsWith('.mdx'))
  
  const posts = files.map(filename => {
    const slug = filename.replace(/\.mdx$/, '')
    const fullPath = path.join(newsDir, filename)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    
    return {
      slug,
      title: data.title || '',
      date: data.date || '',
      category: data.category || 'Allgemein',
      sparte: data.sparte || 'Allgemein',
      image: data.image,
      excerpt: data.excerpt || '',
      content,
    } as NewsPost
  })
  
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getNewsBySlug(slug: string): NewsPost | null {
  const fullPath = path.join(newsDir, `${slug}.mdx`)
  if (!fs.existsSync(fullPath)) return null
  
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)
  
  return {
    slug,
    title: data.title || '',
    date: data.date || '',
    category: data.category || 'Allgemein',
    sparte: data.sparte || 'Allgemein',
    image: data.image,
    excerpt: data.excerpt || '',
    content,
  }
}

export function getTermine() {
  const filePath = path.join(contentDir, 'termine.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

export function getDownloads() {
  const filePath = path.join(contentDir, 'downloads.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

export function getSparten() {
  const filePath = path.join(contentDir, 'sparten.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

export function getAnsprechpartner() {
  const filePath = path.join(contentDir, 'ansprechpartner.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

export function getTrainingszeiten() {
  const filePath = path.join(contentDir, 'trainingszeiten.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

export function getPartner() {
  const filePath = path.join(contentDir, 'partner.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}
