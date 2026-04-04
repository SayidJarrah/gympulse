interface Props {
  title: string;
  body: string;
  onRetry: () => void;
}

export function MemberHomeSectionErrorCard({ title, body, onRetry }: Props) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold leading-tight text-white">{title}</h3>
          <p className="text-sm text-gray-300">{body}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          Retry
        </button>
      </div>
    </div>
  )
}
