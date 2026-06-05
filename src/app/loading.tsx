// Next.js App Router automatically wraps page.tsx in a Suspense boundary
// and shows this component while the async page is rendering.
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function Loading() {
  return <LoadingSkeleton />;
}
