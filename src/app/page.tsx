import { redirect } from 'next/navigation'
import { DEFAULT_LOCALE } from '@/lib/routing'

export default function Root() {
  redirect(`/${DEFAULT_LOCALE}/plan`)
}
