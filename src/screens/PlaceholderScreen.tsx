interface PlaceholderScreenProps {
  screenId: string
  title: string
  route: string
}

/**
 * Every screen not yet built renders through this one component so the
 * routing and role gating built in this step can be exercised end to end
 * before each screen gets its real implementation. Replace a screen by
 * swapping its element in `src/routes/routeConfig.tsx`, not by editing
 * this file.
 */
export default function PlaceholderScreen({ screenId, title, route }: PlaceholderScreenProps) {
  return (
    <div className="flex h-full flex-col gap-2 p-6">
      <p className="text-sm text-ink-muted">{screenId}</p>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-ink-muted">Route: {route}</p>
      <p className="mt-4 max-w-prose text-sm text-ink-muted">
        This screen has not been built yet. It is reachable, role-gated and
        rendered inside the application shell, which is what this step
        establishes.
      </p>
    </div>
  )
}
