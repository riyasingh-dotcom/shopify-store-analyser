/**
 * OAuth callback — exchanges the Shopify authorization code for a
 * permanent Admin API access token and displays it to the developer.
 *
 * Flow:
 *  1. Merchant installs the app from Shopify Admin.
 *  2. Shopify redirects to this URL: /api/auth/callback?code=xxx&shop=xxx
 *  3. We POST to Shopify's token endpoint to exchange the code for a token.
 *  4. We display the token so the developer can paste it into .env.local.
 */

import { NextRequest, NextResponse } from 'next/server';

/** Prevent HTML injection in the token display page. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');

  if (!code || !shop) {
    return NextResponse.json(
      { error: 'Missing "code" or "shop" query parameter from Shopify.' },
      { status: 400 }
    );
  }

  // Validate shop is a real myshopify.com domain to prevent SSRF.
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
    return NextResponse.json(
      { error: 'Invalid shop domain. Must be a *.myshopify.com address.' },
      { status: 400 }
    );
  }

  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'SHOPIFY_API_KEY and SHOPIFY_API_SECRET must be set in .env.local before installing.' },
      { status: 500 }
    );
  }

  // Exchange the one-time authorization code for a permanent access token
  const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: apiSecret,
      code,
    }),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    return NextResponse.json(
      { error: `Token exchange failed: ${tokenResponse.status} — ${text}` },
      { status: 500 }
    );
  }

  const { access_token } = await tokenResponse.json() as { access_token: string };

  const safeShop = escapeHtml(shop);
  const safeToken = escapeHtml(access_token);

  // Show the token so the developer can copy it into .env.local
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Shopify Access Token</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 40px; max-width: 620px; width: 100%; }
    .badge { display: inline-flex; align-items: center; gap: 6px; background: #166534; color: #86efac; border-radius: 9999px; padding: 4px 12px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
    h1 { font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px; }
    p { font-size: 14px; color: #94a3b8; margin-bottom: 20px; line-height: 1.6; }
    pre { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 20px; font-size: 13px; font-family: monospace; color: #a5f3fc; line-height: 1.8; overflow-x: auto; margin-bottom: 20px; }
    .warning { background: #451a03; border: 1px solid #92400e; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #fcd34d; }
    .step { font-size: 13px; color: #64748b; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">&#10003; Connected</div>
    <h1>Your Admin API Access Token</h1>
    <p>Copy the lines below and paste them into your <code style="background:#0f172a;padding:2px 6px;border-radius:4px;">.env.local</code> file, replacing the placeholder values.</p>
    <pre>SHOPIFY_STORE_DOMAIN=${safeShop}
SHOPIFY_ADMIN_ACCESS_TOKEN=${safeToken}</pre>
    <div class="warning">
      &#9888;&#65039; Keep this token secret. Never commit it to git or share it publicly.
    </div>
    <p class="step">After saving .env.local, restart your dev server: <code style="background:#0f172a;padding:2px 6px;border-radius:4px;">npm run dev</code></p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
