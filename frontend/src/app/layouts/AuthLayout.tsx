import { Outlet } from 'react-router'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-desk px-4">
      <div className="w-full max-w-sm">
        <p className="mb-6 text-center font-display text-2xl font-medium text-paper italic">
          Ledger
        </p>
        <div className="relative rounded-2xl bg-paper p-8 shadow-2xl">
          <span
            aria-hidden="true"
            className="absolute -top-2.5 left-7 h-5 w-9 rounded-b-sm bg-brass shadow-sm"
          />
          <Outlet />
        </div>
      </div>
    </div>
  )
}
