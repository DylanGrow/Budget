# 🚀 Deployment Guide for Budget PWA

This guide will help you deploy your Budget PWA to GitHub Pages.

## Prerequisites

- GitHub account
- Git installed on your computer
- Node.js 18+ installed

## Step 1: Prepare Your Repository

1. **Create a new repository on GitHub**
   - Go to https://github.com/new
   - Name it `Budget` (or any name you prefer)
   - Make it public or private
   - Don't initialize with README (we already have one)

2. **Update configuration files**

   In `vite.config.ts`, the base path is already set to `/Budget/`. If you named your repo differently, update line 5:
   ```typescript
   base: '/YourRepoName/',
   ```

   In `index.html`, update the meta tags (lines 19-27) with your actual GitHub username:
   ```html
   <meta property="og:url" content="https://yourusername.github.io/Budget/">
   ```

   In `public/robots.txt` and `public/sitemap.xml`, update the URLs with your username.

## Step 2: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Budget PWA"

# Add your GitHub repository as remote
git remote add origin https://github.com/yourusername/Budget.git

# Push to GitHub
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Click **Pages** in the left sidebar
4. Under **Source**, select **GitHub Actions**
5. The workflow will automatically deploy on push to main branch

## Step 4: Wait for Deployment

1. Go to the **Actions** tab in your repository
2. You'll see the "Deploy Budget PWA to GitHub Pages" workflow running
3. Wait for it to complete (usually 2-3 minutes)
4. Once complete, your site will be live at: `https://yourusername.github.io/Budget/`

## Step 5: Verify Deployment

1. Visit your deployed site
2. Check that all features work:
   - ✅ Page loads correctly
   - ✅ Can add transactions
   - ✅ Categories are populated
   - ✅ Backup/restore works
   - ✅ CSV export works
   - ✅ Install prompt appears (on supported browsers)
   - ✅ Works offline (disconnect internet and reload)

## Troubleshooting

### Issue: 404 Page Not Found

**Solution**: Make sure the `base` path in `vite.config.ts` matches your repository name exactly (case-sensitive).

### Issue: Assets not loading

**Solution**: Check that all asset paths in `index.html` start with `/Budget/` (or your repo name).

### Issue: Service Worker not registering

**Solution**: 
1. Make sure you're accessing via HTTPS (GitHub Pages uses HTTPS by default)
2. Check browser console for errors
3. Clear browser cache and reload

### Issue: Install prompt not showing

**Solution**: 
1. PWA install prompts only show on HTTPS
2. Some browsers require user interaction before showing
3. Check if already installed (look in browser's app menu)

## Custom Domain (Optional)

If you want to use a custom domain:

1. Add a `CNAME` file to the `public` folder with your domain:
   ```
   yourdomain.com
   ```

2. Update `vite.config.ts`:
   ```typescript
   base: '/',  // Change from '/Budget/' to '/'
   ```

3. Configure DNS settings with your domain provider:
   - Add a CNAME record pointing to `yourusername.github.io`

4. In GitHub Settings > Pages, add your custom domain

5. Update all URLs in `index.html`, `robots.txt`, and `sitemap.xml`

## Updating Your Deployment

Every time you push to the main branch, GitHub Actions will automatically rebuild and redeploy your site.

```bash
# Make changes to your code
git add .
git commit -m "Description of changes"
git push
```

## Performance Optimization

Your site is already optimized for Lighthouse 100 scores, but here are some tips:

1. **Icons**: The SVG icons are lightweight. For better compatibility, you can convert them to PNG:
   - Use an online converter or ImageMagick
   - Replace the SVG references in `manifest.json`

2. **Caching**: The service worker caches all assets for offline use

3. **Minification**: Vite automatically minifies JS and CSS in production

## Security Checklist

- ✅ CSP headers configured (no unsafe-inline)
- ✅ No remote resources (adblock friendly)
- ✅ XSS protection implemented
- ✅ Input sanitization active
- ✅ Encrypted backups using Web Crypto API
- ✅ No tracking or analytics

## Monitoring

To monitor your deployment:

1. **GitHub Actions**: Check the Actions tab for build status
2. **Lighthouse**: Run audits using Chrome DevTools
3. **Browser Console**: Check for any errors
4. **Service Worker**: Check Application tab in DevTools

## Support

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/yourusername/Budget/issues)
2. Review the [README.md](README.md) for usage instructions
3. Verify all prerequisites are met
4. Check browser compatibility

---

**Congratulations! Your Budget PWA is now live! 🎉**