import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { LayoutSwitch } from '@/layouts/LayoutSwitch'
import { useScrollTop } from '@/hooks/useScrollTop'
import { RouteSeo } from '@/components/seo/RouteSeo'
import { useDataListener } from '@/hooks/useDataListener'
import { oldSlugRedirect } from '@/seo/oldSlugRedirect'
import { SITE_ROUTES } from '@/seo/routes'
import type { RoutePage } from '@/seo/routes'

// Desktop Pages
import { HomePage } from '@/pages/desktop/HomePage'
import { ProjectsPage } from '@/pages/desktop/ProjectsPage'
import { ProjectDetailPage } from '@/pages/desktop/ProjectDetailPage'
import { PropertiesPage } from '@/pages/desktop/PropertiesPage'
import { PropertyDetailPage } from '@/pages/desktop/PropertyDetailPage'
import { ConsignmentPage } from '@/pages/desktop/ConsignmentPage'
import { ConsignmentDetailPage } from '@/pages/desktop/ConsignmentDetailPage'
import { NewsPage } from '@/pages/desktop/NewsPage'
import { NewsDetailPage } from '@/pages/desktop/NewsDetailPage'
import { ContactPage } from '@/pages/desktop/ContactPage'
import { NotFoundPage } from '@/pages/desktop/NotFoundPage'

// Mobile Pages
import { MobileHomePage } from '@/pages/mobile/MobileHomePage'
import { MobileProjectsPage } from '@/pages/mobile/MobileProjectsPage'
import { MobileProjectDetailPage } from '@/pages/mobile/MobileProjectDetailPage'
import { MobilePropertiesPage } from '@/pages/mobile/MobilePropertiesPage'
import { MobilePropertyDetailPage } from '@/pages/mobile/MobilePropertyDetailPage'
import { MobileConsignmentPage } from '@/pages/mobile/MobileConsignmentPage'
import { MobileConsignmentDetailPage } from '@/pages/mobile/MobileConsignmentDetailPage'
import { MobileNewsPage } from '@/pages/mobile/MobileNewsPage'
import { MobileNewsDetailPage } from '@/pages/mobile/MobileNewsDetailPage'
import { MobileContactPage } from '@/pages/mobile/MobileContactPage'
import { MobileNotFoundPage } from '@/pages/mobile/MobileNotFoundPage'

// Admin Pages
import { AdminPage } from '@/pages/admin/AdminPage'

function ScrollToTop() {
  useScrollTop()
  return null
}

interface PageComponents {
  desktop: React.ComponentType
  mobile: React.ComponentType
}

// Paths come from SITE_ROUTES (src/seo/routes.ts), the single route table shared with the SEO code.
const PAGES: Record<Exclude<RoutePage, 'admin'>, PageComponents> = {
  home: { desktop: HomePage, mobile: MobileHomePage },
  projects: { desktop: ProjectsPage, mobile: MobileProjectsPage },
  project: { desktop: ProjectDetailPage, mobile: MobileProjectDetailPage },
  properties: { desktop: PropertiesPage, mobile: MobilePropertiesPage },
  property: { desktop: PropertyDetailPage, mobile: MobilePropertyDetailPage },
  consignments: { desktop: ConsignmentPage, mobile: MobileConsignmentPage },
  consignment: { desktop: ConsignmentDetailPage, mobile: MobileConsignmentDetailPage },
  news: { desktop: NewsPage, mobile: MobileNewsPage },
  article: { desktop: NewsDetailPage, mobile: MobileNewsDetailPage },
  contact: { desktop: ContactPage, mobile: MobileContactPage },
}

export default function App() {
  useDataListener()
  const { pathname } = useLocation()
  // An item's previous URL goes to its current one instead of a not-found page (the server answers 301 for crawlers).
  const moved = oldSlugRedirect(pathname)
  if (moved) return <Navigate to={moved} replace />

  return (
    <>
      <ScrollToTop />
      <RouteSeo />
      <Routes>
        {SITE_ROUTES.map(({ path, page }) => {
          if (page === 'admin') return <Route key={path} path={path} element={<AdminPage />} />
          const { desktop: DesktopPage, mobile: MobilePage } = PAGES[page]
          return (
            <Route
              key={path}
              path={path}
              element={<LayoutSwitch desktop={<DesktopPage />} mobile={<MobilePage />} />}
            />
          )
        })}
        <Route
          path="*"
          element={<LayoutSwitch desktop={<NotFoundPage />} mobile={<MobileNotFoundPage />} />}
        />
      </Routes>
    </>
  )
}
