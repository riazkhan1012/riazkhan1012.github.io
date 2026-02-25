// ============================================================
// NEW DEVICE SIGN-IN EMAIL — Supabase Edge Function
//
// HOW TO SET THIS UP (step by step):
//
// 1. Install Supabase CLI:  npm install -g supabase
// 2. In your project folder: supabase login
// 3. Create the function:    supabase functions new new-device-email
// 4. Paste this code into:   supabase/functions/new-device-email/index.ts
// 5. Set your Resend API key (or use Supabase's built-in SMTP):
//    supabase secrets set RESEND_API_KEY=your_key_here
// 6. Deploy: supabase functions deploy new-device-email
// 7. In Supabase Dashboard → Database → Webhooks → Create webhook:
//    - Table: auth.sessions (or use auth hooks under Authentication → Hooks)
//    - Event: INSERT
//    - Webhook URL: your function URL
//
// NOTE: Supabase doesn't natively expose device/IP info in auth hooks.
// This function uses the auth.users and request metadata available.
// For full device tracking you'd need to call this function from
// your frontend JS right after a successful login (recommended approach).
// ============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Call this from your frontend immediately after a successful signIn:
//
//   const res = await db.auth.signInWithPassword({...});
//   if (!res.error) {
//     fetch('YOUR_FUNCTION_URL/new-device-email', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json',
//                  'Authorization': 'Bearer ' + res.data.session.access_token },
//       body: JSON.stringify({
//         email: res.data.user.email,
//         signInType: 'Email & Password',
//         deviceType: navigator.userAgent,
//         time: new Date().toUTCString()
//       })
//     });
//   }

const EMAIL_TEMPLATE = (to: string, signInType: string, deviceInfo: string, time: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New Sign In — Tariq Khan</title>
</head>
<body style="margin:0;padding:0;background:#f5f1ea;font-family:Arial,sans-serif;color:#1a1814;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d8d3c8;">

          <tr>
            <td style="background:#131210;padding:28px 36px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:1.5rem;letter-spacing:0.12em;color:#f0ece3;">Tariq<span style="color:#e8621a;">.</span>Khan</p>
            </td>
          </tr>

          <tr>
            <td style="padding:36px;">
              <p style="margin:0 0 8px;font-size:0.7rem;letter-spacing:0.25em;text-transform:uppercase;color:#e8621a;">Security Notice</p>
              <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:1.6rem;font-weight:400;color:#1a1814;">New sign in to your account</h1>

              <p style="margin:0 0 24px;font-size:0.95rem;line-height:1.8;color:#4a4540;">
                A new device just signed in to your <strong>tariqkhan</strong> account.
                If you don't recognise this device, please check your account for any unauthorised activity,
                and make sure the sign-in method used is secure.
              </p>

              <!-- Details table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;border:1px solid #d8d3c8;">
                <tr>
                  <td style="padding:10px 16px;background:#f5f1ea;border-bottom:1px solid #d8d3c8;">
                    <p style="margin:0;font-size:0.65rem;letter-spacing:0.15em;text-transform:uppercase;color:#8a8070;">Sign in type</p>
                    <p style="margin:4px 0 0;font-size:0.9rem;color:#1a1814;">${signInType}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;border-bottom:1px solid #d8d3c8;">
                    <p style="margin:0;font-size:0.65rem;letter-spacing:0.15em;text-transform:uppercase;color:#8a8070;">Device</p>
                    <p style="margin:4px 0 0;font-size:0.9rem;color:#1a1814;">${deviceInfo.substring(0, 80)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;">
                    <p style="margin:0;font-size:0.65rem;letter-spacing:0.15em;text-transform:uppercase;color:#8a8070;">Time</p>
                    <p style="margin:4px 0 0;font-size:0.9rem;color:#1a1814;">${time}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:0.85rem;color:#8a8070;">
                If this was you, no action is needed. If you don't recognise this sign-in,
                sign out immediately and change your password.
              </p>

              <!-- Sign out button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="background:#e84a4a;">
                    <a href="https://riazkhan1012.github.io/foodmap.html"
                       style="display:inline-block;padding:12px 24px;font-size:0.78rem;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#ffffff;text-decoration:none;">
                      Sign out of this device
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:8px 0 0;font-size:0.72rem;color:#8a8070;">
                If you're having trouble with the above button,
                <a href="https://riazkhan1012.github.io/foodmap.html" style="color:#e8621a;">click here</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 36px;"><hr style="border:none;border-top:1px solid #d8d3c8;margin:0;"/></td>
          </tr>

          <tr>
            <td style="padding:24px 36px;">
              <p style="margin:0;font-size:0.72rem;color:#8a8070;line-height:1.7;">
                This is an automated security email from Tariq Khan.<br/>
                Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { email, signInType = "Email & Password", deviceType = "Unknown device", time } = await req.json();
  const displayTime = time || new Date().toUTCString();

  // Using Resend (resend.com — free tier: 100 emails/day)
  // You can swap this for any email provider
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return new Response("Missing API key", { status: 500 });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Tariq Khan <noreply@yourdomain.com>", // ← update with your verified sender
      to: email,
      subject: "New sign in to your Tariq Khan account",
      html: EMAIL_TEMPLATE(email, signInType, deviceType, displayTime),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(`Email failed: ${err}`, { status: 500 });
  }

  return new Response(JSON.stringify({ sent: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
