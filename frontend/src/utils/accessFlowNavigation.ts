export type MembershipBanner = 'activated' | 'already-active'
export type AccessFlowSource = 'home'

interface PlansPathOptions {
  source?: AccessFlowSource;
  highlight?: string | null;
}

function buildPath(pathname: string, searchParams: URLSearchParams, hash?: string): string {
  const search = searchParams.toString()
  return `${pathname}${search ? `?${search}` : ''}${hash ?? ''}`
}

export function buildHomeMembershipPath(banner?: MembershipBanner): string {
  const searchParams = new URLSearchParams()

  if (banner) {
    searchParams.set('membershipBanner', banner)
  }

  return buildPath('/home', searchParams, '#membership')
}

export function buildPlansPath({ source, highlight }: PlansPathOptions = {}): string {
  const searchParams = new URLSearchParams()

  if (source) {
    searchParams.set('source', source)
  }

  if (highlight) {
    searchParams.set('highlight', highlight)
  }

  return buildPath('/plans', searchParams)
}

export function getMembershipBanner(searchParams: URLSearchParams): MembershipBanner | null {
  const banner = searchParams.get('membershipBanner')
  return banner === 'activated' || banner === 'already-active' ? banner : null
}

export function withoutMembershipBanner(searchParams: URLSearchParams): URLSearchParams {
  const nextSearchParams = new URLSearchParams(searchParams)
  nextSearchParams.delete('membershipBanner')
  return nextSearchParams
}

export function getAccessFlowSource(searchParams: URLSearchParams): AccessFlowSource | null {
  const source = searchParams.get('source')
  return source === 'home' ? source : null
}

export function getHighlightedPlanId(searchParams: URLSearchParams): string | null {
  return searchParams.get('highlight')
}
