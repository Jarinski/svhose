import GlasModal from '@/components/news/GlasModal'

// Der Fensterrahmen sitzt im Layout, nicht in der Seite: So steht er sofort (mit der Ladeanzeige
// darin) und fährt nur einmal herein, während der Beitrag nachgeladen wird.
export default function NewsFensterLayout({ children }: { children: React.ReactNode }) {
  return <GlasModal>{children}</GlasModal>
}
