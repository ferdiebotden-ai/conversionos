export const revalidate = 3600

import type { Metadata } from 'next'
import { getBranding } from '@/lib/branding'
import { getCompanyConfig } from '@/lib/ai/knowledge/company'
import { getPageLayout } from '@/lib/page-layout'
import { getDesignTokens } from '@/lib/theme'
import { SectionRenderer } from '@/components/section-renderer'

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding()
  return {
    title: "Our Projects",
    description: `Browse our portfolio of kitchen, bathroom, basement, and flooring renovations in ${branding.city}, ${branding.province} and surrounding areas.`,
  }
}

export default async function ProjectsPage() {
  const [branding, config, layout, tokens] = await Promise.all([
    getBranding(),
    getCompanyConfig(),
    getPageLayout('projects'),
    getDesignTokens(),
  ])

  return (
    <div className="flex flex-col">
      <SectionRenderer sections={layout} branding={branding} config={config} tokens={tokens} />
    </div>
  )
}
