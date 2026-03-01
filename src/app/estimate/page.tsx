import { redirect } from 'next/navigation';

export async function generateMetadata() {
  return {
    title: 'Get an Instant Estimate',
    description: 'Chat with our AI assistant to get a preliminary renovation estimate in minutes.',
  };
}

/**
 * /estimate now redirects to /visualizer (Design Studio).
 * The full flow (visualize → refine → lead capture) lives on one page.
 */
export default function EstimatePage() {
  redirect('/visualizer');
}
