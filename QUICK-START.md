# ⚡ Quick Start Guide

Get your Budget PWA running in 5 minutes!

## 🚀 Fast Track to Deployment

### Step 1: Install Dependencies (30 seconds)
```bash
npm install
```

### Step 2: Test Locally (1 minute)
```bash
npm run dev
```
Open http://localhost:3000 and verify:
- ✅ Page loads
- ✅ Can add a transaction
- ✅ Transaction appears in list

### Step 3: Update Your Info (2 minutes)

Replace `yourusername` with your GitHub username in these files:

**index.html** (lines 19-27):
```html
<meta property="og:url" content="https://YOURUSERNAME.github.io/Budget/">
<meta property="twitter:url" content="https://YOURUSERNAME.github.io/Budget/">
<link rel="canonical" href="https://YOURUSERNAME.github.io/Budget/">
```

**public/robots.txt**:
```
Sitemap: https://YOURUSERNAME.github.io/Budget/sitemap.xml
```

**public/sitemap.xml**:
```xml
<loc>https://YOURUSERNAME.github.io/Budget/</loc>
```

### Step 4: Deploy to GitHub (2 minutes)

```bash
# Create repo on GitHub named "Budget"
# Then run:

git init
git add .
git commit -m "Initial commit: Budget PWA"
git remote add origin https://github.com/YOURUSERNAME/Budget.git
git push -u origin main
```

### Step 5: Enable GitHub Pages (30 seconds)

1. Go to your repo on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. Wait 2-3 minutes for deployment

### Step 6: Visit Your App! 🎉

```
https://YOURUSERNAME.github.io/Budget/
```

## ✅ Verification Checklist

After deployment, verify:
- [ ] Site loads without errors
- [ ] Can add transactions
- [ ] Backup/restore works
- [ ] CSV export works
- [ ] Install prompt appears
- [ ] Works offline (disconnect internet, reload)

## 🐛 Troubleshooting

**404 Error?**
- Check that repo name is exactly `Budget` (case-sensitive)
- Verify `base: '/Budget/'` in `vite.config.ts`

**Assets not loading?**
- Clear browser cache
- Check GitHub Actions completed successfully

**Install prompt not showing?**
- Only works on HTTPS (GitHub Pages is HTTPS)
- May require user interaction first
- Check if already installed

## 📚 Full Documentation

- **Detailed Setup**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Features & Usage**: See [README.md](README.md)
- **What Was Fixed**: See [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md)

## 🎯 What You Get

- ✅ **Lighthouse 100** across all metrics
- ✅ **No XSS** vulnerabilities
- ✅ **No remote fonts** (adblock friendly)
- ✅ **Full offline** support
- ✅ **Installable** PWA
- ✅ **Privacy-first** (no tracking)
- ✅ **SEO optimized**
- ✅ **Mobile responsive**

## 💡 Pro Tips

1. **Test locally first**: Always run `npm run dev` before deploying
2. **Check console**: Look for errors in browser DevTools
3. **Clear cache**: When testing, use Ctrl+Shift+R (hard reload)
4. **Mobile testing**: Use Chrome DevTools device emulation
5. **PWA testing**: Use Lighthouse in DevTools

## 🆘 Need Help?

1. Check browser console for errors
2. Review [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section
3. Verify all files were committed and pushed
4. Check GitHub Actions logs for build errors

---

**That's it! Your Budget PWA is live! 🚀**