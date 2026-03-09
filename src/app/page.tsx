export const revalidate = 3600

import { getBranding } from '@/lib/branding'
import { getCompanyConfig } from '@/lib/ai/knowledge/company'
import { getPageLayout } from '@/lib/page-layout'
import { SectionRenderer } from '@/components/section-renderer'

export default async function Home() {
  const [branding, config, layout] = await Promise.all([
    getBranding(),
    getCompanyConfig(),
    getPageLayout('homepage'),
  ])

  return (
    <div className="flex flex-col">
      <SectionRenderer sections={layout} branding={branding} config={config} />
    </div>
  )
}
