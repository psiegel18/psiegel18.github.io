# Deployment Guide

This guide will help you deploy the Next.js application to Vercel, set up Neon Postgres, configure authentication, and disable GitHub Pages/Cloudflare hosting.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Set Up Neon Postgres Database](#1-set-up-neon-postgres-database)
3. [Configure OAuth Providers](#2-configure-oauth-providers)
4. [Deploy to Vercel](#3-deploy-to-vercel)
5. [Configure Environment Variables](#4-configure-environment-variables)
6. [Disable GitHub Pages](#5-disable-github-pages)
7. [Update Domain DNS (Cloudflare)](#6-update-domain-dns-cloudflare)
8. [Post-Deployment Setup](#7-post-deployment-setup)

---

## Prerequisites

- [Vercel Account](https://vercel.com)
- [Neon Account](https://neon.tech)
- [GitHub Account](https://github.com)
- Access to OAuth provider consoles (Google, GitHub, Microsoft, Apple)
- Domain access (psiegel.org)
- Cloudflare account (for DNS management)

---

## 1. Set Up Neon Postgres Database

### Create Database

1. Go to [Neon Console](https://console.neon.tech)
2. Click **New Project**
3. Name it: `psiegel-website`
4. Select region closest to your users (e.g., `us-east-1`)
5. Click **Create Project**

### Get Connection Strings

1. In your Neon dashboard, go to **Connection Details**
2. Copy both connection strings:
   - **Pooled connection** (for `DATABASE_URL`)
   - **Direct connection** (for `DIRECT_URL`)

Example format:
```
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require&connection_limit=1"
```

---

## 2. Configure OAuth Providers

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Configure consent screen if prompted
6. Application type: **Web application**
7. Add authorized redirect URIs:
   - `https://psiegel.org/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
8. Copy **Client ID** and **Client Secret**

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in:
   - Application name: `Psiegel.org`
   - Homepage URL: `https://psiegel.org`
   - Authorization callback URL: `https://psiegel.org/api/auth/callback/github`
4. Copy **Client ID** and **Client Secret**

### Microsoft OAuth (Azure AD)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in:
   - Name: `Psiegel.org`
   - Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
   - Redirect URI: `https://psiegel.org/api/auth/callback/azure-ad`
5. Copy **Application (client) ID**
6. Go to **Certificates & secrets** > **New client secret**
7. Copy the secret value

### Apple OAuth (Optional)

1. Go to [Apple Developer](https://developer.apple.com)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Create a new **Services ID**
4. Configure Sign in with Apple
5. Add return URL: `https://psiegel.org/api/auth/callback/apple`
6. Generate a private key

---

## 3. Deploy to Vercel

### Initial Deployment

1. Go to [Vercel](https://vercel.com)
2. Click **Add New** > **Project**
3. Import from GitHub: `psiegel18/psiegel18.github.io`
4. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Click **Deploy** (it will fail initially - that's expected)

### Add Custom Domain

1. In Vercel project settings, go to **Domains**
2. Add `psiegel.org` and `www.psiegel.org`
3. Vercel will provide DNS records to add

---

## 4. Configure Environment Variables

In Vercel project settings, go to **Environment Variables** and add:

```env
# Database
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# NextAuth
NEXTAUTH_URL=https://psiegel.org
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# OAuth Providers
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>

MICROSOFT_CLIENT_ID=<your-azure-client-id>
MICROSOFT_CLIENT_SECRET=<your-azure-client-secret>

# Optional: Apple OAuth
APPLE_CLIENT_ID=<your-apple-client-id>
APPLE_CLIENT_SECRET=<your-apple-client-secret>

# Admin email (your email to get admin access)
ADMIN_EMAIL=your-email@example.com
```

### Generate NEXTAUTH_SECRET

Run this command locally:
```bash
openssl rand -base64 32
```

---

## 5. Disable GitHub Pages

### Option A: Via GitHub Settings

1. Go to your repository: `github.com/psiegel18/psiegel18.github.io`
2. Navigate to **Settings** > **Pages**
3. Under **Source**, select **None**
4. Click **Save**

### Option B: Delete CNAME File

The CNAME file tells GitHub Pages to use your custom domain. Removing it disables custom domain hosting:

1. Delete the `CNAME` file from the repository
2. Commit and push

### Option C: Rename Repository (Optional)

If you want to completely disable GitHub Pages:
1. Go to **Settings** > **General**
2. Rename repository to something other than `psiegel18.github.io`
   (e.g., `psiegel-website`)

---

## 6. Update Domain DNS (Cloudflare)

### Remove Old DNS Records

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain: `psiegel.org`
3. Go to **DNS** > **Records**
4. Delete any existing A, AAAA, or CNAME records pointing to GitHub Pages

### Add Vercel DNS Records

Add the records Vercel provided:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | @ | 76.76.21.21 | DNS only |
| CNAME | www | cname.vercel-dns.com | DNS only |

**Important**: Set proxy status to **DNS only** (gray cloud) for Vercel to work properly.

### Verify Domain in Vercel

1. Go back to Vercel > **Domains**
2. Click **Refresh** to verify DNS configuration
3. Wait for SSL certificate to be provisioned (usually < 5 minutes)

---

## 7. Post-Deployment Setup

### Initialize Database

After first deployment with all environment variables:

1. Go to Vercel > **Deployments**
2. Click **Redeploy** on the latest deployment
3. The `postinstall` script will run `prisma generate`
4. Database tables will be created automatically

### Verify Admin Access

1. Sign in with the email you set as `ADMIN_EMAIL`
2. Navigate to `/admin` to verify admin access
3. Check `/admin/house` for TheHouse portal

### Test Features

- [ ] Home page loads
- [ ] Guest auto-login works
- [ ] OAuth sign-in works (test each provider)
- [ ] Snake game works and saves scores
- [ ] Tetris game works and saves scores
- [ ] Leaderboard shows scores
- [ ] Birthday calculator works
- [ ] Admin dashboard accessible (for admin users)
- [ ] TheHouse portal accessible (for admin users)

---

## Troubleshooting

### Build Fails

- Check Vercel build logs for errors
- Ensure all environment variables are set
- Run `npm run build` locally to test

### Database Connection Issues

- Verify DATABASE_URL is correct
- Check Neon dashboard for connection status
- Ensure IP is not blocked (Neon allows all by default)

### OAuth Not Working

- Verify redirect URIs match exactly
- Check that client ID/secret are correct
- Ensure provider is enabled in their console

### Domain Not Working

- DNS propagation can take up to 48 hours
- Verify Cloudflare proxy is disabled
- Check Vercel domain verification status

---

## Maintenance

### Update Dependencies

```bash
npm update
npm run build
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Database Migrations

After schema changes:
```bash
npx prisma db push
```

### Viewing Database

```bash
npx prisma studio
```

Or use Neon's web console.

---

## Quick Reference

| Service | URL |
|---------|-----|
| Live Site | https://psiegel.org |
| Vercel Dashboard | https://vercel.com |
| Neon Console | https://console.neon.tech |
| GitHub Repo | https://github.com/psiegel18/psiegel18.github.io |
| Cloudflare DNS | https://dash.cloudflare.com |
