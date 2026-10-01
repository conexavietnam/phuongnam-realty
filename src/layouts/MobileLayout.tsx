import type { ReactNode } from 'react'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav'
import { MobileCTAFloat } from '@/components/mobile/MobileCTAFloat'

interface MobileLayoutProps {
  children: ReactNode
}

export function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col pb-16">
      <MobileHeader />
      <main className="flex-1 pt-14">{children}</main>
      <MobileCTAFloat />
      <MobileBottomNav />
    </div>
  )
}
