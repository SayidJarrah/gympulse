interface Props {
  title: string;
  body: string;
}

export function MemberHomeSectionEmptyCard({ title, body }: Props) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 px-6 py-10 text-center">
      <h3 className="text-lg font-semibold leading-tight text-white">{title}</h3>
      <p className="mt-2 text-sm text-gray-400">{body}</p>
    </div>
  )
}
