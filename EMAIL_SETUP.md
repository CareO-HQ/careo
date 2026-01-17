# Email Configuration Guide

## Overview

CareO uses [Resend](https://resend.com) as the email service provider for sending transactional emails including:
- Team invitation emails
- Password reset emails
- Two-factor authentication (2FA) codes
- PDF attachments for care plans and reports

## Why Email Doesn't Work After Cloning

The email functionality requires a **RESEND_API_KEY** environment variable to be configured. This API key is:
- Personal to each Resend account
- NOT committed to version control for security reasons
- **Required** for any email sending to work

Without this configuration, emails will fail silently or throw errors when:
- Inviting users to organizations/teams
- Sending password reset links
- Sending 2FA verification codes
- Emailing care plan PDFs

## Setup Instructions

### Step 1: Get Your Resend API Key

1. **Create a Resend account** (if you don't have one):
   - Visit [https://resend.com](https://resend.com)
   - Sign up for a free account (includes 100 emails/day)

2. **Get your API key**:
   - Log in to [Resend Dashboard](https://resend.com/api-keys)
   - Navigate to **API Keys** section
   - Click **Create API Key**
   - Give it a name (e.g., "CareO Development")
   - Copy the generated API key (starts with `re_`)

### Step 2: Configure Environment Variables

1. **Copy the example environment file**:
   ```bash
   cp .env.example .env.local
   ```

2. **Add your Resend API key** to `.env.local`:
   ```bash
   RESEND_API_KEY="re_your_actual_api_key_here"
   ```

3. **Configure other required variables** (see `.env.example` for full list):
   ```bash
   NEXT_PUBLIC_BASE_URL="http://localhost:3000"
   BETTER_AUTH_SECRET="your-secret-key-here"
   BETTER_AUTH_URL="http://localhost:3000"
   ```

### Step 3: Verify Domain (Production Only)

For **production deployments**, you must verify your sending domain with Resend:

1. **Add your domain** in Resend Dashboard:
   - Go to [Domains](https://resend.com/domains)
   - Click **Add Domain**
   - Enter your domain (e.g., `yourdomain.com`)

2. **Add DNS records**:
   - Resend will provide DNS records (DKIM, SPF, etc.)
   - Add these records to your domain's DNS settings
   - Wait for verification (usually takes a few minutes)

3. **Update email sender** in code:
   - Once verified, update the `from` addresses in `lib/auth.ts:60,79,100`
   - Change from `uprio@auth.tryuprio.com` to `noreply@yourdomain.com`

### Step 4: Test Email Functionality

Start your development server and test:

```bash
npm run dev
```

Test these features:
- [ ] Send a team invitation email
- [ ] Request a password reset
- [ ] Enable 2FA and receive verification code
- [ ] Email a care plan PDF

## Email Implementation Details

### Files Using Resend

1. **`lib/resend.ts`** - Resend client initialization
2. **`lib/auth.ts`** - Authentication emails (password reset, 2FA, invitations)
3. **`convex/emails.ts`** - PDF attachment emails

### Email Types

| Email Type | Trigger | Sent From | Template Location |
|------------|---------|-----------|-------------------|
| Team Invitation | User invites member | `lib/auth.ts:97-109` | Better Auth plugin |
| Password Reset | User requests reset | `lib/auth.ts:57-69` | Better Auth plugin |
| 2FA Code | User enables 2FA | `lib/auth.ts:77-88` | Better Auth plugin |
| PDF Attachment | Care plan export | `convex/emails.ts:11-77` | Convex action |

### Current Configuration

**Sender addresses:**
- Authentication emails: `Uprio <uprio@auth.tryuprio.com>`
- PDF emails: `Careo <noreply@auth.tryuprio.com>`

**Note:** These should be updated to your verified domain in production.

## Common Issues & Troubleshooting

### Issue 1: "Resend API key not found"
**Cause:** Missing `RESEND_API_KEY` in `.env.local`
**Solution:** Follow Step 2 above to add your API key

### Issue 2: "Email not delivered"
**Cause:** Using unverified domain in production
**Solution:** Verify your domain (Step 3) or use Resend's testing email in development

### Issue 3: "Invalid API key"
**Cause:** Incorrect or expired API key
**Solution:** Generate a new API key from Resend dashboard

### Issue 4: "Rate limit exceeded"
**Cause:** Free tier limit (100 emails/day) exceeded
**Solution:** Upgrade your Resend plan or wait 24 hours

### Issue 5: Emails work locally but not in production
**Cause:** Environment variables not configured in deployment
**Solution:** Add `RESEND_API_KEY` to your hosting platform's environment variables

## Development vs Production

### Development
- Use Resend free tier (100 emails/day)
- Can send to any email address
- No domain verification required
- Use test email addresses

### Production
- **Must verify domain** with Resend
- Configure sender addresses with verified domain
- Set up proper DNS records (SPF, DKIM, DMARC)
- Monitor email delivery and bounce rates

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use different API keys** for development and production
3. **Rotate API keys** periodically
4. **Restrict API key permissions** (if available)
5. **Monitor API key usage** in Resend dashboard

## Team Setup Checklist

When onboarding new developers:

- [ ] Share this documentation
- [ ] Ensure they create their own Resend account
- [ ] Verify they've added `RESEND_API_KEY` to `.env.local`
- [ ] Test email functionality works on their machine
- [ ] Confirm `.env.local` is in `.gitignore`

## Resend Pricing

| Plan | Price | Emails/Month | Features |
|------|-------|--------------|----------|
| Free | $0 | 3,000 | Basic features, unverified domain |
| Pro | $20/mo | 50,000 | Custom domains, webhooks, analytics |
| Business | Custom | Unlimited | Dedicated IPs, priority support |

**Recommendation:** Free tier is sufficient for development. Upgrade to Pro for production.

## Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Node.js SDK](https://github.com/resendlabs/resend-node)
- [Better Auth Email Configuration](https://www.better-auth.com/docs/plugins/email-password)
- [Domain Verification Guide](https://resend.com/docs/dashboard/domains/introduction)

## Support

If email issues persist:
1. Check Resend dashboard for delivery logs
2. Review application logs for errors
3. Verify environment variables are loaded correctly
4. Test with Resend's API directly using curl

---

**Last Updated:** 2025-12-18
