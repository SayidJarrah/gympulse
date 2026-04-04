import type { MembershipBanner } from '../../utils/accessFlowNavigation'

interface Props {
  banner: MembershipBanner;
}

const BANNER_CONTENT: Record<
  MembershipBanner,
  {
    title?: string;
    body: string;
    className: string;
  }
> = {
  activated: {
    title: 'Membership activated',
    body: 'Your access is live and class booking is now available.',
    className: 'border-green-500/30 bg-green-500/10 text-green-100',
  },
  'already-active': {
    body: 'Your membership is already active. Manage your current access here.',
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-100',
  },
}

export function MembershipAccessBanner({ banner }: Props) {
  const content = BANNER_CONTENT[banner]

  return (
    <div role="status" className={`rounded-2xl border px-4 py-4 ${content.className}`}>
      {content.title ? (
        <p className="text-sm font-semibold uppercase tracking-[0.16em]">{content.title}</p>
      ) : null}
      <p className={content.title ? 'mt-2 text-sm opacity-90' : 'text-sm opacity-90'}>
        {content.body}
      </p>
    </div>
  )
}
