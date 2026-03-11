export const revalidate = 3600

import { getBranding } from '@/lib/branding'
import { getCompanyConfig } from '@/lib/ai/knowledge/company'
import { getPageLayout } from '@/lib/page-layout'
import { getDesignTokens } from '@/lib/theme'
import { SectionRenderer } from '@/components/section-renderer'
import { getCopyContext } from '@/lib/copy/server'
import { getContactMetaDescription } from '@/lib/copy/site-copy'

export async function generateMetadata() {
  const [branding, copyCtx] = await Promise.all([getBranding(), getCopyContext()])
  return {
    title: "Contact Us",
    description: getContactMetaDescription(copyCtx, branding),
  }
}

export default async function ContactPage() {
  const [branding, config, layout, tokens] = await Promise.all([
    getBranding(),
    getCompanyConfig(),
    getPageLayout('contact'),
    getDesignTokens(),
  ])

  return (
    <div className="flex flex-col">
      <SectionRenderer sections={layout} branding={branding} config={config} tokens={tokens} />
    </div>
  )
}
