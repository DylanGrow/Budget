# Deployment Guide

Complete instructions for deploying the Budget PWA to GitHub Pages.

## Prerequisites

- GitHub account
- Git installed locally
- Node.js 20+ installed
- Repository created on GitHub

## Initial Setup

### 1. Create GitHub Repository

```bash
# Create new repository on GitHub (via web interface)
# Then clone it locally
git clone https://github.com/YOUR_USERNAME/budget-pwa.git
cd budget-pwa
```

### 2. Initialize Project

```bash
# Initialize npm project
npm init -y

# Install dependencies
npm install idb chart.js

# Install dev dependencies
npm install -D \
  vite \
  typescript \
  @types/node \
  vite-plugin-pwa \
  workbox-window \
  vitest \
  @vitest/coverage-v8 \
  @playwright/test \
  eslint \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  prettier
```

### 3. Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Path mapping */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

```json
// tsconfig.node.json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

### 4. Configure Vite for GitHub Pages

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // IMPORTANT: Set base to your repo name for GitHub Pages
  base: process.env.GITHUB_REPOSITORY 
    ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
    : '/',
  
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Budget Tracker - Offline Budget Manager',
        short_name: 'Budget',
        description: 'Privacy-focused offline budget tracker',
        theme_color: '#4ECDC4',
        background_color: '#ffffff',
        display: 'standalone',
        scope: './',
        start_url: './',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              }
            }
          }
        ]
      }
    })
  ],
  
  build: {
    target: 'es2020',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'chart': ['chart.js'],
          'idb': ['idb']
        }
      }
    }
  }
});
```

### 5. Create GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          GITHUB_REPOSITORY: ${{ github.repository }}

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 6. Configure GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions**
4. Save the configuration

### 7. Add Required Files

```html
<!-- public/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Privacy-focused offline budget tracker">
  <meta name="theme-color" content="#4ECDC4">
  
  <!-- Security Headers -->
  <meta http-equiv="Content-Security-Policy" 
        content="default-src 'self'; 
                 script-src 'self'; 
                 style-src 'self' 'unsafe-inline'; 
                 img-src 'self' data: blob:; 
                 font-src 'self' https://fonts.gstatic.com;">
  
  <!-- PWA -->
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  
  <title>Budget Tracker</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

```
# public/robots.txt
User-agent: *
Allow: /
```

```
# .gitignore
# Dependencies
node_modules/

# Build output
dist/
dist-ssr/

# Environment
.env
.env.local
.env.*.local

# Editor
.vscode/*
!.vscode/extensions.json
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage/
.nyc_output/
test-results/
playwright-report/

# Temporary
*.tmp
.cache/
```

## Deployment Steps

### Method 1: Automatic Deployment (Recommended)

```bash
# 1. Commit your code
git add .
git commit -m "Initial commit"

# 2. Push to GitHub
git push origin main

# 3. GitHub Actions will automatically build and deploy
# Check the Actions tab in your repository to monitor progress
```

### Method 2: Manual Deployment

```bash
# 1. Build the project
npm run build

# 2. Create gh-pages branch (first time only)
git checkout -b gh-pages

# 3. Copy dist contents to root
cp -r dist/* .

# 4. Commit and push
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages

# 5. Switch back to main
git checkout main
```

## Post-Deployment Configuration

### 1. Enable HTTPS

GitHub Pages automatically provides HTTPS. Ensure it's enabled:
1. Go to **Settings** → **Pages**
2. Check **Enforce HTTPS**

### 2. Custom Domain (Optional)

If you want to use a custom domain:

1. Add a `CNAME` file to the `public` directory:
```
yourdomain.com
```

2. Configure DNS records with your domain provider:
```
Type: CNAME
Name: www (or @)
Value: YOUR_USERNAME.github.io
```

3. In GitHub Settings → Pages, add your custom domain

### 3. Verify PWA Installation

1. Visit your deployed site: `https://YOUR_USERNAME.github.io/budget-pwa/`
2. Open DevTools → Application → Manifest
3. Verify manifest is loaded correctly
4. Check Service Worker is registered
5. Test "Add to Home Screen" functionality

## Testing Deployment

### Local Preview

```bash
# Build and preview locally
npm run build
npm run preview

# Open http://localhost:4173
```

### Lighthouse Audit

```bash
# Install Lighthouse CLI
npm install -g @lhci/cli

# Run audit
lhci autorun --collect.url=https://YOUR_USERNAME.github.io/budget-pwa/
```

Target scores:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90
- PWA: 100

## Troubleshooting

### Issue: 404 on Refresh

**Solution**: Ensure `navigateFallback` is set in Vite PWA config:
```typescript
workbox: {
  navigateFallback: 'index.html'
}
```

### Issue: Assets Not Loading

**Solution**: Check `base` path in `vite.config.ts`:
```typescript
base: '/budget-pwa/' // Must match repository name
```

### Issue: Service Worker Not Updating

**Solution**: Clear cache and hard reload:
- Chrome: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or: DevTools → Application → Clear storage

### Issue: Build Fails in GitHub Actions

**Solution**: Check Node version compatibility:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20' # Match your local version
```

## Monitoring & Analytics

### Setup Privacy-Preserving Analytics (Optional)

```typescript
// src/analytics.ts
class Analytics {
  private enabled: boolean = false;

  async init() {
    const settings = await db.getSettings();
    this.enabled = settings.analyticsEnabled;
  }

  track(event: string, data?: Record<string, any>) {
    if (!this.enabled) return;
    
    // Use privacy-preserving analytics like Plausible or Simple Analytics
    // No personal data, no cookies, GDPR compliant
    console.log('Analytics:', event, data);
  }
}

export const analytics = new Analytics();
```

## Maintenance

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update all dependencies
npm update

# Update major versions (carefully)
npm install package@latest
```

### Monitor Performance

Use GitHub Actions to run Lighthouse CI on every deployment:

```yaml
# Add to .github/workflows/deploy.yml
- name: Run Lighthouse CI
  run: |
    npm install -g @lhci/cli
    lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

## Rollback Procedure

If deployment fails:

```bash
# 1. Revert to previous commit
git revert HEAD

# 2. Push to trigger new deployment
git push origin main

# Or manually deploy previous version
git checkout <previous-commit-hash>
npm run build
# Deploy dist/ contents
```

## Security Checklist

- ✅ HTTPS enabled
- ✅ Content Security Policy configured
- ✅ No sensitive data in repository
- ✅ Dependencies regularly updated
- ✅ Dependabot alerts enabled
- ✅ Branch protection rules set
- ✅ Code scanning enabled (optional)

## Performance Optimization

### 1. Enable Compression

GitHub Pages automatically serves gzipped files. Verify:
```bash
curl -H "Accept-Encoding: gzip" -I https://YOUR_USERNAME.github.io/budget-pwa/
```

### 2. Optimize Images

```bash
# Install image optimization tool
npm install -D vite-plugin-imagemin

# Add to vite.config.ts
import viteImagemin from 'vite-plugin-imagemin';

plugins: [
  viteImagemin({
    gifsicle: { optimizationLevel: 7 },
    optipng: { optimizationLevel: 7 },
    mozjpeg: { quality: 80 },
    pngquant: { quality: [0.8, 0.9] },
    svgo: { plugins: [{ name: 'removeViewBox', active: false }] }
  })
]
```

### 3. Code Splitting

Already configured in `vite.config.ts`:
```typescript
rollupOptions: {
  output: {
    manualChunks: {
      'chart': ['chart.js'],
      'idb': ['idb']
    }
  }
}
```

## Continuous Improvement

### Weekly Tasks
- Monitor GitHub Actions for failed builds
- Check Dependabot alerts
- Review user feedback (if available)

### Monthly Tasks
- Run Lighthouse audit
- Update dependencies
- Review and optimize bundle size
- Check browser compatibility

### Quarterly Tasks
- Security audit
- Performance review
- Feature planning
- Documentation updates

## Support & Resources

- **GitHub Pages Docs**: https://docs.github.com/pages
- **Vite Docs**: https://vitejs.dev
- **PWA Docs**: https://web.dev/progressive-web-apps/
- **Workbox Docs**: https://developers.google.com/web/tools/workbox

## Quick Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run preview         # Preview production build

# Testing
npm run test            # Run all tests
npm run test:unit       # Unit tests only
npm run test:e2e        # E2E tests only

# Code Quality
npm run lint            # Run linter
npm run format          # Format code
npm run type-check      # TypeScript check

# Deployment
git push origin main    # Trigger automatic deployment
```

Your Budget PWA is now deployed and accessible at:
`https://YOUR_USERNAME.github.io/budget-pwa/`