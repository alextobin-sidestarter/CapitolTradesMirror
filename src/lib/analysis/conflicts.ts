/**
 * Conflict of Interest Analysis Engine
 *
 * Scores each trade against a politician's committee assignments
 * to surface potential conflicts of interest.
 *
 * Conflict score: 0-100
 * - 0: No overlap between committee jurisdiction and traded company
 * - 50: Committee has general oversight of the sector
 * - 80: Committee has direct jurisdiction over the company's sector
 * - 100: Chair/Ranking Member with direct oversight + large trade
 */

import { COMMITTEE_SECTORS, STOCK_SECTORS } from '../sync/congress-api'

export interface ConflictScore {
  trade_id: string
  politician_id: string
  ticker: string
  committee_name: string
  committee_role: string // 'Chair', 'Ranking Member', 'Member'
  overlap_sectors: string[]
  score: number // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical'
  explanation: string
}

export interface PoliticianCommittee {
  name: string
  role: string // 'Chair', 'Ranking Member', 'Member'
  chamber: string
}

export function calculateConflictScore(
  ticker: string,
  transactionType: string,
  amountMax: number | null,
  committees: PoliticianCommittee[]
): ConflictScore[] {
  const stockSectors = STOCK_SECTORS[ticker] || []
  if (!stockSectors.length) return []

  const conflicts: ConflictScore[] = []

  for (const committee of committees) {
    const committeeSectors = COMMITTEE_SECTORS[committee.name] || []
    const overlap = stockSectors.filter(s => committeeSectors.includes(s))

    if (!overlap.length) continue

    let score = 0

    // Base score from overlap
    score += overlap.length * 15

    // Role multiplier
    if (committee.role === 'Chair') score += 30
    else if (committee.role === 'Ranking Member') score += 20
    else score += 5

    // Amount multiplier
    if (amountMax && amountMax >= 1_000_000) score += 20
    else if (amountMax && amountMax >= 250_000) score += 10
    else if (amountMax && amountMax >= 50_000) score += 5

    score = Math.min(score, 100)

    const severity: ConflictScore['severity'] =
      score >= 75 ? 'critical' :
      score >= 50 ? 'high' :
      score >= 25 ? 'medium' : 'low'

    const action = transactionType === 'Purchase' ? 'purchased' : 'sold'
    const roleStr = committee.role === 'Chair' ? `Chair of the ${committee.name} Committee` :
      committee.role === 'Ranking Member' ? `Ranking Member of the ${committee.name} Committee` :
      `Member of the ${committee.name} Committee`

    conflicts.push({
      trade_id: '',
      politician_id: '',
      ticker,
      committee_name: committee.name,
      committee_role: committee.role,
      overlap_sectors: overlap,
      score,
      severity,
      explanation: `As ${roleStr}, this member oversees ${overlap.join(', ')} — directly relevant to ${ticker}. They ${action} up to $${(amountMax || 0).toLocaleString()} in stock.`,
    })
  }

  return conflicts.sort((a, b) => b.score - a.score)
}

// Known committee assignments for seeded politicians
// In production, this comes from Congress.gov API
export const KNOWN_COMMITTEES: Record<string, PoliticianCommittee[]> = {
  'nancy-pelosi': [
    { name: 'Intelligence', role: 'Member', chamber: 'House' },
    { name: 'Appropriations', role: 'Member', chamber: 'House' },
  ],
  'dan-crenshaw': [
    { name: 'Intelligence', role: 'Member', chamber: 'House' },
    { name: 'Energy and Commerce', role: 'Member', chamber: 'House' },
    { name: 'Homeland Security and Governmental Affairs', role: 'Member', chamber: 'House' },
  ],
  'tommy-tuberville': [
    { name: 'Armed Services', role: 'Member', chamber: 'Senate' },
    { name: 'Agriculture', role: 'Member', chamber: 'Senate' },
    { name: 'Commerce, Science, and Transportation', role: 'Member', chamber: 'Senate' },
  ],
  'mark-kelly': [
    { name: 'Armed Services', role: 'Member', chamber: 'Senate' },
    { name: 'Commerce, Science, and Transportation', role: 'Member', chamber: 'Senate' },
    { name: 'Science, Space, and Technology', role: 'Member', chamber: 'Senate' },
  ],
  'ro-khanna': [
    { name: 'Armed Services', role: 'Member', chamber: 'House' },
    { name: 'Oversight and Accountability', role: 'Member', chamber: 'House' },
    { name: 'Science, Space, and Technology', role: 'Member', chamber: 'House' },
  ],
  'josh-gottheimer': [
    { name: 'Financial Services', role: 'Member', chamber: 'House' },
    { name: 'Intelligence', role: 'Member', chamber: 'House' },
  ],
  'michael-mccaul': [
    { name: 'Foreign Affairs', role: 'Chair', chamber: 'House' },
    { name: 'Homeland Security and Governmental Affairs', role: 'Member', chamber: 'House' },
  ],
  'marjorie-taylor-greene': [
    { name: 'Oversight and Accountability', role: 'Member', chamber: 'House' },
    { name: 'Homeland Security and Governmental Affairs', role: 'Member', chamber: 'House' },
  ],
  'kevin-hern': [
    { name: 'Ways and Means', role: 'Member', chamber: 'House' },
    { name: 'Budget', role: 'Member', chamber: 'House' },
  ],
  'pete-sessions': [
    { name: 'Appropriations', role: 'Member', chamber: 'House' },
    { name: 'Rules', role: 'Member', chamber: 'House' },
  ],
}
