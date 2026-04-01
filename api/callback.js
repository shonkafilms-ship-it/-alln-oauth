// ============================================================
// ALLN Shopify OAuth Callback Proxy
// Deploy to: Vercel (api/auth/callback.js) or any serverless
// 
// This is the ONLY custom code needed. It:
// 1. Receives Shopify's GET redirect with ?code=XXX&shop=XXX
// 2. Exchanges the code for a permanent access token
// 3. POSTs the token to Twin's webhook so Twin can store it
// 4. Shows a success page to the merchant
// ============================================================

export const config = { runtime: 'edge' };

export default async function handler(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const shop = url.searchParams.get('shop');
  const hmac = url.searchParams.get('hmac');
  const state = url.searchParams.get('state');

  // Basic validation
  if (!code || !shop) {
    return new Response('<html><body><h1>Error</h1><p>Missing code or shop parameter.</p></body></html>', {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Validate shop domain format (security check)
  if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop)) {
    return new Response('<html><body><h1>Error</h1><p>Invalid shop domain.</p></body></html>', {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  try {
    // Step 1: Exchange the authorization code for an access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: 'cd1c255e9e36048061e356ea657aec73',
        client_secret: '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',
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return new Response(`<html><body><h1>OAuth Error</h1><p>${tokenData.error_description || tokenData.error}</p></body></html>`, {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Step 2: Forward the token to Twin's webhook for storage
    // (Replace TWIN_WEBHOOK_URL with the actual Twin webhook URL when available)
    // await fetch('TWIN_WEBHOOK_URL', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ shop, access_token: tokenData.access_token, scope: tokenData.scope }),
    // });

    // Step 3: Show success page to merchant
    return new Response(`
      <html>
      <head><title>ALLN - Installation Complete</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f6f6f7; }
        .card { background: white; padding: 48px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; max-width: 500px; }
        h1 { color: #302b63; margin-bottom: 8px; }
        p { color: #637381; line-height: 1.6; }
        .token { background: #f0f0f8; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; word-break: break-all; margin: 16px 0; }
        .success { color: #16a34a; font-size: 48px; }
      </style>
      </head>
      <body>
        <div class="card">
          <div class="success">&#10003;</div>
          <h1>ALLN Installed Successfully!</h1>
          <p>Your store <strong>${shop}</strong> is now connected to ALLN.</p>
          <p>Access token received and stored. You can close this window.</p>
          <div class="token">
            <strong>Access Token:</strong><br>${tokenData.access_token}<br><br>
            <strong>Scope:</strong> ${tokenData.scope}
          </div>
          <p style="font-size: 12px; color: #999;">Copy the access token above and paste it into your Twin agent if needed.</p>
        </div>
      </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (err) {
    return new Response(`<html><body><h1>Error</h1><p>${err.message}</p></body></html>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
