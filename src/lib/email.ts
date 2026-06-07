/**
 * Email sending via Resend (free tier: 3,000 emails/month)
 * Sign up free at resend.com — no credit card needed
 * Set RESEND_API_KEY in .env.local
 */

interface TradeAlertData {
  to: string
  politicianName: string
  ticker: string | null
  companyName: string | null
  transactionType: string
  amountMin: number | null
  amountMax: number | null
  transactionDate: string | null
  politicianSlug: string
  unsubscribeToken: string
}

function formatAmount(min: number | null, max: number | null): string {
  if (!min && !max) return 'Undisclosed'
  if (min && max) {
    if (max >= 1_000_000) return `$${(min / 1_000_000).toFixed(1)}M – $${(max / 1_000_000).toFixed(1)}M`
    if (max >= 1_000) return `$${(min / 1_000).toFixed(0)}K – $${(max / 1_000).toFixed(0)}K`
  }
  return `$${min}`
}

export async function sendTradeAlert(data: TradeAlertData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log('RESEND_API_KEY not set — skipping email')
    return false
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://45.55.38.251'
  const action = data.transactionType === 'Purchase' ? '🟢 Bought' : '🔴 Sold'
  const stock = data.ticker || data.companyName || 'Unknown'
  const amount = formatAmount(data.amountMin, data.amountMax)

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0a;color:#ededed;padding:32px;border-radius:12px">
      <div style="font-size:24px;margin-bottom:4px">⚖ Capitol Mirror</div>
      <div style="color:#6b7280;font-size:14px;margin-bottom:32px">Congressional Trade Alert</div>

      <div style="background:#111;border:1px solid #222;border-radius:12px;padding:24px;margin-bottom:24px">
        <div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:8px">${data.politicianName}</div>
        <div style="font-size:32px;font-weight:700;color:${data.transactionType === 'Purchase' ? '#10b981' : '#ef4444'};margin-bottom:4px">
          ${action} ${stock}
        </div>
        <div style="color:#9ca3af;font-size:14px">${amount} · ${data.transactionDate || 'Date unknown'}</div>
      </div>

      <a href="${baseUrl}/politicians/${data.politicianSlug}"
         style="display:block;background:#10b981;color:#000;font-weight:600;text-align:center;padding:14px;border-radius:8px;text-decoration:none;margin-bottom:24px">
        View Full Trade History →
      </a>

      <div style="color:#4b5563;font-size:12px;text-align:center">
        <a href="${baseUrl}/api/alerts?token=${data.unsubscribeToken}" style="color:#4b5563">Unsubscribe</a>
        · Capitol Mirror · Public congressional disclosure data
      </div>
    </div>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Capitol Mirror <alerts@capitolmirror.app>',
        to: data.to,
        subject: `🔔 ${data.politicianName} just ${data.transactionType === 'Purchase' ? 'bought' : 'sold'} ${stock}`,
        html,
      }),
    })

    return res.ok
  } catch {
    return false
  }
}

export async function sendWelcomeEmail(to: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Capitol Mirror <hello@capitolmirror.app>',
      to,
      subject: '👋 Welcome to Capitol Mirror',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:32px">
          <div style="font-size:32px;margin-bottom:16px">⚖</div>
          <h1 style="font-size:24px;font-weight:700">Welcome to Capitol Mirror</h1>
          <p style="color:#6b7280">You're now tracking congressional stock trades in real time.</p>
          <p style="color:#6b7280">Go to your portfolio page to follow politicians and get alerts when they trade.</p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://45.55.38.251'}/portfolio"
             style="display:inline-block;background:#10b981;color:#000;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">
            Set Up Your Portfolio →
          </a>
        </div>
      `,
    }),
  })
}
