import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">
      <Loader2 size={18} className="animate-spin mr-2" />
      Laden…
    </div>
  )
}

