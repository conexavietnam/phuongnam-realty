import { Routes, Route } from 'react-router-dom'
import { LayoutSwitch } from '@/layouts/LayoutSwitch'
import { useScrollTop } from '@/hooks/useScrollTop'

// Desktop Pages
import { HomePage } from '@/pages/desktop/HomePage'
import { ProjectsPage } from '@/pages/desktop/ProjectsPage'
import { ProjectDetailPage } from '@/pages/desktop/ProjectDetailPage'
import { PropertiesPage } from '@/pages/desktop/PropertiesPage'
import { PropertyDetailPage } from '@/pages/desktop/PropertyDetailPage'
import { ConsignmentPage } from '@/pages/desktop/ConsignmentPage'
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
import { MobileNewsPage } from '@/pages/mobile/MobileNewsPage'
import { MobileNewsDetailPage } from '@/pages/mobile/MobileNewsDetailPage'
import { MobileContactPage } from '@/pages/mobile/MobileContactPage'
import { MobileNotFoundPage } from '@/pages/mobile/MobileNotFoundPage'

function ScrollToTop() {
  useScrollTop()
  return null
}

interface RouteConfig {
  path: string
  desktop: React.ComponentType
  mobile: React.ComponentType
}

const routes: RouteConfig[] = [
  { path: '/', desktop: HomePage, mobile: MobileHomePage },
  { path: '/du-an', desktop: ProjectsPage, mobile: MobileProjectsPage },
  { path: '/du-an/:slug', desktop: ProjectDetailPage, mobile: MobileProjectDetailPage },
  { path: '/chuyen-nhuong', desktop: PropertiesPage, mobile: MobilePropertiesPage },
  { path: '/chuyen-nhuong/:slug', desktop: PropertyDetailPage, mobile: MobilePropertyDetailPage },
  { path: '/ky-gui', desktop: ConsignmentPage, mobile: MobileConsignmentPage },
  { path: '/tin-tuc', desktop: NewsPage, mobile: MobileNewsPage },
  { path: '/tin-tuc/:slug', desktop: NewsDetailPage, mobile: MobileNewsDetailPage },
  { path: '/lien-he', desktop: ContactPage, mobile: MobileContactPage },
  { path: '*', desktop: NotFoundPage, mobile: MobileNotFoundPage },
]

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {routes.map(({ path, desktop: DesktopPage, mobile: MobilePage }) => (
          <Route
            key={path}
            path={path}
            element={
              <LayoutSwitch
                desktop={<DesktopPage />}
                mobile={<MobilePage />}
              />
            }
          />
        ))}
      </Routes>
    </>
  )
}
