import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-desk px-4 text-center">
      <p className="font-mono text-xs tracking-[0.2em] text-brass uppercase">404</p>
      <h1 className="font-display text-2xl text-ink">Page not found</h1>
      <p className="max-w-sm font-mono text-sm text-fog">
        The page you&apos;re looking for doesn&apos;t exist, or the URL is mistyped.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs tracking-wide text-fog uppercase transition-colors hover:text-brass-light"
      >
        <span aria-hidden="true" className="-translate-y-px">
          ←
        </span>
        <span>Back home</span>
      </Link>
    </div>
  )
}
