/**
 * Congress.gov API — free with API key
 * Sign up at: https://api.congress.gov/sign-up/
 * Returns all current members of House + Senate with:
 * - Party, state, district
 * - Committee assignments
 * - Leadership positions
 */

const BASE = 'https://api.congress.gov/v3'

export interface CongressMember {
  bioguideId: string
  name: string
  firstName: string
  lastName: string
  party: string
  state: string
  district?: string
  chamber: string // 'Senate' | 'House of Representatives'
  terms: { item: { chamber: string; startYear: number; endYear?: number }[] }
  depiction?: { imageUrl: string }
  url: string
}

export interface CommitteeAssignment {
  bioguideId: string
  committeeName: string
  committeeCode: string
  rank: string // 'Chair', 'Ranking Member', 'Member'
  chamber: string
}

// Committee → related industries/sectors
export const COMMITTEE_SECTORS: Record<string, string[]> = {
  // House committees
  'Financial Services': ['Banks', 'Insurance', 'Real Estate', 'Financial Technology', 'Cryptocurrency'],
  'Energy and Commerce': ['Oil & Gas', 'Pharmaceuticals', 'Telecom', 'Healthcare', 'Utilities'],
  'Armed Services': ['Defense', 'Aerospace', 'Weapons Systems', 'Cybersecurity'],
  'Judiciary': ['Legal Services', 'Technology', 'Media', 'Telecommunications'],
  'Intelligence': ['Defense', 'Cybersecurity', 'Technology', 'Surveillance'],
  'Science, Space, and Technology': ['Technology', 'Space', 'Semiconductors', 'AI'],
  'Ways and Means': ['Tax Policy', 'Trade', 'Healthcare', 'Social Security'],
  'Appropriations': ['Government Contractors', 'Defense', 'Infrastructure'],
  'Transportation and Infrastructure': ['Airlines', 'Railroads', 'Construction', 'Logistics'],
  'Agriculture': ['Farming', 'Food Processing', 'Fertilizers', 'Agricultural Tech'],
  'Natural Resources': ['Mining', 'Oil & Gas', 'Timber', 'Water Utilities'],
  'Oversight and Accountability': ['Government Contractors', 'Healthcare', 'Technology'],
  'Foreign Affairs': ['Defense', 'International Trade', 'Energy'],
  // Senate committees
  'Banking, Housing, and Urban Affairs': ['Banks', 'Insurance', 'Real Estate', 'Cryptocurrency'],
  'Commerce, Science, and Transportation': ['Technology', 'Telecom', 'Airlines', 'Semiconductors'],
  'Finance': ['Tax Policy', 'Healthcare', 'Trade', 'Social Security'],
  'Health, Education, Labor, and Pensions': ['Pharmaceuticals', 'Healthcare', 'Education'],
  'Armed Services': ['Defense', 'Aerospace', 'Cybersecurity'],
  'Intelligence (Senate)': ['Defense', 'Cybersecurity', 'Technology'],
  'Environment and Public Works': ['Oil & Gas', 'Utilities', 'Environmental Tech'],
  'Homeland Security and Governmental Affairs': ['Cybersecurity', 'Defense', 'Technology'],
}

// Stock sector mappings
export const STOCK_SECTORS: Record<string, string[]> = {
  NVDA: ['Semiconductors', 'AI', 'Technology'],
  AAPL: ['Technology', 'Telecom'],
  MSFT: ['Technology', 'AI', 'Cybersecurity', 'Cloud'],
  GOOG: ['Technology', 'AI', 'Telecom', 'Advertising'],
  META: ['Technology', 'Social Media', 'AI', 'Advertising'],
  AMZN: ['Technology', 'Cloud', 'Logistics', 'Retail'],
  TSLA: ['Electric Vehicles', 'Energy', 'AI', 'Space'],
  JPM: ['Banks', 'Financial Technology'],
  GS: ['Banks', 'Investment Banking'],
  BAC: ['Banks', 'Financial Technology'],
  XOM: ['Oil & Gas'],
  CVX: ['Oil & Gas'],
  LMT: ['Defense', 'Aerospace', 'Weapons Systems'],
  RTX: ['Defense', 'Aerospace'],
  NOC: ['Defense', 'Aerospace', 'Cybersecurity'],
  BA: ['Aerospace', 'Defense'],
  COIN: ['Cryptocurrency', 'Financial Technology'],
  MSTR: ['Cryptocurrency', 'Technology'],
  PFE: ['Pharmaceuticals', 'Healthcare'],
  JNJ: ['Pharmaceuticals', 'Healthcare'],
  UNH: ['Healthcare', 'Insurance'],
  T: ['Telecom'],
  VZ: ['Telecom'],
  NEE: ['Utilities', 'Environmental Tech'],
  DIS: ['Media', 'Entertainment', 'Technology'],
}

export function getApiKey(): string {
  return process.env.CONGRESS_API_KEY || ''
}

export async function fetchAllMembers(congress = 119): Promise<CongressMember[]> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('CONGRESS_API_KEY not set')

  const members: CongressMember[] = []
  let offset = 0
  const limit = 250

  while (true) {
    const url = `${BASE}/member?congress=${congress}&limit=${limit}&offset=${offset}&api_key=${apiKey}`
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) break

    const data = await res.json()
    const batch = data.members || []
    members.push(...batch)

    if (members.length >= (data.pagination?.count || 0) || batch.length < limit) break
    offset += limit
    await new Promise(r => setTimeout(r, 300))
  }

  return members
}

export async function fetchMemberDetails(bioguideId: string): Promise<any> {
  const apiKey = getApiKey()
  if (!apiKey) return null

  const res = await fetch(`${BASE}/member/${bioguideId}?api_key=${apiKey}`, {
    headers: { 'Accept': 'application/json' },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.member
}

export async function fetchMemberCommittees(bioguideId: string): Promise<any[]> {
  const apiKey = getApiKey()
  if (!apiKey) return []

  const res = await fetch(
    `${BASE}/member/${bioguideId}/committee-assignment?api_key=${apiKey}`,
    { headers: { 'Accept': 'application/json' } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.committeeAssignments || []
}

export function mapMemberToDb(member: CongressMember) {
  const name = member.name || `${member.firstName} ${member.lastName}`
  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const chamber = member.chamber?.includes('Senate') ? 'Senate' : 'House'
  const party = member.party === 'Democratic' ? 'D' : member.party === 'Republican' ? 'R' : 'I'

  return {
    full_name: name,
    first_name: member.firstName,
    last_name: member.lastName,
    slug: slugify(name),
    party,
    chamber,
    state: member.state,
    district: member.district ? String(member.district) : null,
    photo_url: member.depiction?.imageUrl || null,
    bioguide_id: member.bioguideId,
    is_active: true,
  }
}
