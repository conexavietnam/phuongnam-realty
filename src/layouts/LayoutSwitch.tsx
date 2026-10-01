import type { ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useMediaQuery'

interface LayoutSwitchProps {
  desktop: ReactNode
  mobile: ReactNode
}

export function LayoutSwitch({ desktop, mobile }: LayoutSwitchProps) {
  const isMobile = useIsMobile()
  return <>{isMobile ? mobile : desktop}</>
}
