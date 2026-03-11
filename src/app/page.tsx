export const revalidate = 3600

import { getBranding } from '@/lib/branding'
import { getCompanyConfig } from '@/lib/ai/knowledge/company'
import { getPageLayout } from '@/lib/page-layout'
import { getDesignTokens } from '@/lib/theme'
import { SectionRenderer } from '@/components/section-renderer'

export default async function Home() {
  const [branding, config, layout, tokens] = await Promise.all([
    getBranding(),
    getCompanyConfig(),
    getPageLayout('homepage'),
    getDesignTokens(),
  ])

  return (
    <div className="flex flex-col">
      <SectionRenderer sections={layout} branding={branding} config={config} tokens={tokens} />
    </div>
  )
}
