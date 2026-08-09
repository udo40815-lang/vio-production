# Vio — Supabase Auth Email Templates
Open https://supabase.com/dashboard/project/xvpxpxhgjeevxfuwsvff/auth/templates
and paste the templates below into each respective tab.

## Confirm Signup

Subject: `Welcome to Vio — Confirm your email`

Message Body (HTML):
```html
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#070A18">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#070A18;padding:40px 0">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0F1228,#141832);border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.06)">
<tr><td style="padding:48px 40px;text-align:center">
<div style="font-size:32px;margin-bottom:24px">⬡</div>
<h1 style="color:#F8FAFC;font-size:24px;font-weight:700;margin:0 0 8px;letter-spacing:-0.02em">Welcome to Vio</h1>
<p style="color:rgba(248,250,252,0.6);font-size:15px;line-height:1.6;margin:0 0 32px">You are one step away from joining the creator community where value gets discovered.</p>
<a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#5B3DF5,#7C3AED);color:#FFFFFF;font-size:15px;font-weight:600;border-radius:100px;text-decoration:none;letter-spacing:-0.01em">Confirm your email</a>
<p style="color:rgba(248,250,252,0.35);font-size:12px;margin:32px 0 0;line-height:1.5">If you did not create a Vio account, you can safely ignore this email.</p>
</td></tr>
<tr><td style="padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06)">
<p style="color:rgba(248,250,252,0.25);font-size:11px;margin:0">© 2026 Vio. Where value gets discovered.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>
```

## Reset Password

Subject: `Reset your Vio password`

Message Body (HTML): same as above, replace "Welcome to Vio" with "Reset your password",
"one step away from joining" with "Click below to reset your password.",
"Confirm your email" with "Reset password", and use `{{ .ConfirmationURL }}` (which is the reset URL).

## Magic Link

Subject: `Your Vio sign-in link`
Same design, use `{{ .Token }}` for the magic link URL.
