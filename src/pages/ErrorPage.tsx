import { useRouteError, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'

function getErrorMessage(error: unknown): string | null {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return null
}

export function ErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()
  const message = getErrorMessage(error)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <h1 className="font-serif text-xl font-semibold text-foreground">
          Something went wrong
        </h1>
        {message && (
          <p className="mt-2 text-sm text-destructive">{message}</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          An unexpected error occurred.
        </p>
        <Button className="mt-6" onClick={() => { navigate('/') }}>
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}
