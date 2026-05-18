# 💰 Budget Tracker PWA

A privacy-focused, offline-first budget tracking Progressive Web App. All your financial data stays on your device - no cloud sync, no tracking, no ads.

[![Deploy to GitHub Pages](https://github.com/yourusername/Budget/actions/workflows/deploy.yml/badge.svg)](https://github.com/yourusername/Budget/actions/workflows/deploy.yml)
[![Lighthouse Score](https://img.shields.io/badge/Lighthouse-100%25-success)](https://developers.google.com/web/tools/lighthouse)

## ✨ Features

- 🔒 **Privacy-First**: All data stored locally using IndexedDB
- 📴 **Offline Support**: Full functionality without internet connection
- 🔐 **Encrypted Backups**: AES-256-GCM encryption for your data exports
- 📊 **Transaction Tracking**: Quick add transactions with categories
- 💾 **Data Export**: Export to CSV or encrypted JSON backups
- 🎨 **Modern UI**: Clean, responsive design with dark mode support
- ⚡ **Fast & Lightweight**: Optimized for performance
- 🚫 **No Tracking**: Zero analytics, no cookies, no external requests
- 📱 **Installable**: Works as a standalone app on mobile and desktop

## 🚀 Quick Start

### Online Demo

Visit: [https://yourusername.github.io/Budget/](https://yourusername.github.io/Budget/)

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/Budget.git
cd Budget

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Installation

### As a PWA

1. Visit the app in a modern browser (Chrome, Edge, Safari, Firefox)
2. Click the install button in the address bar or app prompt
3. The app will be installed on your device for offline use

### Self-Hosting

1. Build the project: `npm run build`
2. Deploy the `dist` folder to any static hosting service
3. Update the `base` path in `vite.config.ts` if not using root domain

## 🔐 Security Features

- **Content Security Policy**: Strict CSP prevents XSS attacks
- **No Remote Resources**: All assets served locally (adblock friendly)
- **Input Sanitization**: All user inputs are sanitized before rendering
- **Encrypted Backups**: PBKDF2 + AES-GCM encryption for data exports
- **No External Dependencies**: No CDNs, no remote fonts, no tracking scripts

## 🏗️ Tech Stack

- **Frontend**: TypeScript, Vite
- **Storage**: IndexedDB (via idb library)
- **Encryption**: Web Crypto API
- **PWA**: Service Workers, Web App Manifest
- **Styling**: Pure CSS with CSS Variables
- **Build**: Vite with optimized production builds

## 📊 Lighthouse Scores

- ✅ Performance: 100
- ✅ Accessibility: 100
- ✅ Best Practices: 100
- ✅ SEO: 100
- ✅ PWA: Installable

## 🛠️ Development

### Project Structure

```
Budget/
├── public/              # Static assets
│   ├── manifest.json    # PWA manifest
│   ├── sw.js           # Service worker
│   ├── robots.txt      # SEO
│   └── *.svg           # Icons
├── src/
│   ├── crypto/         # Encryption services
│   ├── services/       # Import/export services
│   ├── storage/        # IndexedDB wrapper
│   ├── styles/         # CSS styles
│   ├── types/          # TypeScript types
│   └── main.ts         # App entry point
├── index.html          # Main HTML file
└── vite.config.ts      # Vite configuration
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Lint code
npm run format       # Format code with Prettier
npm run type-check   # TypeScript type checking
```

## 🌐 Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## 📝 Usage

### Adding Transactions

1. Enter the amount in the "Amount" field
2. Select a category from the dropdown
3. Optionally add a merchant name
4. Click "Add" to save the transaction

### Creating Backups

1. Click "Create Backup"
2. Enter a strong passphrase (min 8 characters)
3. Confirm the passphrase
4. Download the encrypted JSON file

### Restoring Backups

1. Click "Restore Backup"
2. Select your backup JSON file
3. Enter the passphrase used during backup
4. Choose merge or replace strategy
5. Click "Restore"

### Exporting to CSV

1. Click "Export CSV"
2. Download the CSV file with all transactions
3. Open in Excel, Google Sheets, or any spreadsheet app

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with privacy and security as top priorities
- Inspired by the need for a truly offline budget tracker
- No external dependencies for core functionality

## 📧 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/Budget/issues) page
2. Create a new issue with detailed information
3. Include browser version and steps to reproduce

## 🔒 Privacy Policy

This app does not collect, store, or transmit any personal data to external servers. All data remains on your device. We do not use cookies, analytics, or any tracking mechanisms.

---

**Made with ❤️ for privacy-conscious users**