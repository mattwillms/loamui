import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <p className="font-serif text-6xl font-semibold text-primary/30">404</p>
        <h1 className="mt-4 font-serif text-xl font-semibold text-foreground">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn't exist or has been moved.
        </p>
        <Button className="mt-6" onClick={() => { navigate('/gardens') }}>
          Back to gardens
        </Button>
      </div>
    </div>
  )
}
