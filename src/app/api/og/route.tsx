import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'Capitol Mirror'
  const sub = searchParams.get('sub') || 'Congressional Stock Trading Tracker'

  const html = `
    <html>
      <body style="margin:0;background:#0a0a0a;font-family:system-ui,sans-serif;width:1200px;height:630px;display:flex;flex-direction:column;justify-content:center;padding:80px">
        <div style="color:#10b981;font-size:32px;margin-bottom:16px">⚖ Capitol Mirror</div>
        <div style="color:white;font-size:64px;font-weight:700;line-height:1.1;margin-bottom:24px">${title}</div>
        <div style="color:#9ca3af;font-size:28px">${sub}</div>
        <div style="position:absolute;bottom:60px;left:80px;color:#4b5563;font-size:20px">capitolmirror.com</div>
      </body>
    </html>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
