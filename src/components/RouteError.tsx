import { Link, useRouteError } from 'react-router'

export function RouteError() {
  const error = useRouteError()
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
      <h1 className="text-2xl font-bold">Page failed to load</h1>
      <p className="max-w-md text-center text-ink-soft">{message}</p>
      <Link to="/" className="font-medium text-accent hover:underline">
        Back to dashboard
      </Link>
    </div>
  )
}
