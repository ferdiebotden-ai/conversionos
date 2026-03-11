export const revalidate = 3600

import { getBranding } from '@/lib/branding'
import { getCompanyConfig } from '@/lib/ai/knowledge/company'
import { getPageLayout } from '@/lib/page-layout'
import { getDesignTokens } from '@/lib/theme'
import { SectionRenderer } from '@/components/section-renderer'

export async function generateMetadata() {
  const branding = await getBranding()
  return {
    title: "About Us",
    description: `Learn about ${branding.name} — ${branding.city}, ${branding.province}'s trusted renovation contractor. Quality craftsmanship for residential and commercial projects.`,
  }
}

export default async function AboutPage() {
  const [branding, config, layout, tokens] = await Promise.all([
    getBranding(),
    getCompanyConfig(),
    getPageLayout('about'),
    getDesignTokens(),
  ])

  return (
    <div className="flex flex-col">
      <SectionRenderer sections={layout} branding={branding} config={config} tokens={tokens} />
    </div>
  )
}
