export default function BoardsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-9 w-48 rounded bg-muted" />
      <div className="mt-3 h-5 w-72 max-w-full rounded bg-muted" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-40 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}
