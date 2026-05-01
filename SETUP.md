# Budget PWA - Setup & Installation Guide

## Quick Start

### Prerequisites
- Node.js 20+ installed
- npm or yarn
- Git
- Modern browser (Chrome, Firefox, Edge, or Safari)

### Installation Steps

1. **Clone or create the repository**
```bash
mkdir budget-pwa
cd budget-pwa
git init
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm run dev
```

4. **Open in browser**
```
http://localhost:5173
```

The app should now be running! You can:
- Add transactions
- Create encrypted backups
- Test offline functionality (disconnect network)

---

## Project Structure

```
budget-pwa/
├── .github/workflows/     # CI/CD configuration
├── public/               # Static assets
│   ├── manifest.json     # PWA manifest
│   └── robots.txt
├── src/
│   ├── crypto/          # Encryption services
│   ├── services/        # Business logic
│   ├── storage/         # IndexedDB wrapper
│   ├── styles/          # CSS files
│   ├── types/           # TypeScript types
│   └── main.ts          # App entry point
├── index.html           # Main HTML file
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── vite.config.ts       # Vite configuration
└── README.md            # Documentation
```

---

## Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Lint code
npm run lint

# Format code
npm run format
```

### Testing the App

1. **Add a transaction**
   - Enter amount (e.g., 25.99)
   - Select category
   - Optionally add merchant
   - Click "Add"

2. **Create a backup**
   - Click "Create Backup"
   - Enter a passphrase (min 8 characters)
   - Confirm passphrase
   - File will download automatically

3. **Test offline mode**
   - Open DevTools (F12)
   - Go to Network tab
   - Select "Offline"
   - App should still work!

4. **Restore backup**
   - Click "Restore Backup"
   - Select your backup file
   - Enter passphrase
   - Choose merge or replace strategy

---

## Deployment to GitHub Pages

### Option 1: Automatic (Recommended)

1. **Create GitHub repository**
```bash
git remote add origin https://github.com/YOUR_USERNAME/budget-pwa.git
```

2. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: GitHub Actions

3. **Push to GitHub**
```bash
git add .
git commit -m "Initial commit"
git push -u origin main
```

4. **Automatic deployment**
   - GitHub Actions will build and deploy automatically
   - Check Actions tab for progress
   - App will be live at: `https://YOUR_USERNAME.github.io/budget-pwa/`

### Option 2: Manual

```bash
# Build the app
npm run build

# The dist/ folder contains your built app
# Deploy dist/ contents to any static hosting
```

---

## Configuration

### Update Base URL for GitHub Pages

In `vite.config.ts`, the base URL is automatically set based on your repository name:

```typescript
base: process.env.GITHUB_REPOSITORY 
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
  : '/',
```

If deploying to a custom domain, change to:
```typescript
base: '/',
```

### PWA Icons

You need to create PWA icons:

1. **Create icons** (192x192 and 512x512 PNG)
2. **Place in public/ folder**:
   - `public/pwa-192x192.png`
   - `public/pwa-512x512.png`
   - `public/favicon.ico`
   - `public/apple-touch-icon.png`

**Quick icon generation:**
- Use https://realfavicongenerator.net/
- Or create manually with any image editor

---

## Troubleshooting

### TypeScript Errors

If you see TypeScript errors about missing modules:
```bash
npm install
```

The errors are expected until dependencies are installed.

### Build Fails

1. **Check Node version**
```bash
node --version  # Should be 20+
```

2. **Clear cache and reinstall**
```bash
rm -rf node_modules package-lock.json
npm install
```

3. **Check for syntax errors**
```bash
npm run type-check
```

### App Won't Load

1. **Check browser console** (F12)
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Try incognito/private mode**
4. **Check if service worker is registered**:
   - DevTools → Application → Service Workers

### Offline Mode Not Working

1. **Service worker must be registered first**
   - Load app while online
   - Wait for "SW registered" in console
   - Then go offline

2. **Check service worker status**:
   - DevTools → Application → Service Workers
   - Should show "activated and running"

### Storage Quota Exceeded

1. **Check storage usage** (shown in app footer)
2. **Delete old transactions or receipts**
3. **Create backup before clearing**
4. **Clear browser data** if needed

---

## Browser Support

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | Full support |
| Edge | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |

### Required APIs
- IndexedDB ✅
- Service Workers ✅
- Web Crypto API ✅
- Cache API ✅

---

## Security Notes

### Data Storage
- All data stored in browser's IndexedDB
- No data sent to any server
- Backups encrypted with AES-256-GCM

### Passphrase Security
- Minimum 8 characters required
- Recommend 12+ characters
- Use mix of letters, numbers, symbols
- Store passphrase securely (password manager)

### HTTPS Required
- GitHub Pages provides HTTPS automatically
- Required for service workers
- Required for Web Crypto API

---

## Performance

### Bundle Sizes (Target)
- Core bundle: < 200 KB gzipped
- Chart.js: Lazy loaded
- Total initial load: < 300 KB

### Optimization Tips
1. **Code splitting** already configured
2. **Service worker** caches assets
3. **IndexedDB** for fast local reads
4. **Lazy load** heavy features

---

## Next Steps

### Enhance the App

1. **Add more features**
   - Reports and charts
   - Budget forecasting
   - Recurring transactions
   - Receipt OCR

2. **Improve UI**
   - Add more screens
   - Better mobile experience
   - Animations and transitions

3. **Add tests**
   - Unit tests with Vitest
   - E2E tests with Playwright

4. **Customize**
   - Change colors in CSS
   - Add your own categories
   - Modify budget periods

### Resources

- **Vite Docs**: https://vitejs.dev
- **PWA Guide**: https://web.dev/progressive-web-apps/
- **IndexedDB**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **Web Crypto**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API

---

## Support

### Getting Help

1. **Check documentation** in this repository
2. **Review specifications** in markdown files
3. **Check browser console** for errors
4. **Test in different browser** to isolate issues

### Common Issues

**Q: App won't install as PWA**  
A: Ensure HTTPS is enabled and manifest.json is accessible

**Q: Backup file won't restore**  
A: Verify passphrase is correct (case-sensitive)

**Q: Transactions not showing**  
A: Check browser console for errors, try refreshing

**Q: Storage full**  
A: Delete old data or receipts, create backup first

---

## License

MIT License - Feel free to use and modify!

---

**Ready to start?** Run `npm install && npm run dev` and open http://localhost:5173

**Need help?** Check the troubleshooting section above or review the technical specifications.