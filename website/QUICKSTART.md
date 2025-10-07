# Website Development Quick Start

## 🚀 Running Locally

### Recommended: Live Server Extension

1. **Install Live Server** (if not already installed):
   - Open VS Code Extensions (`Ctrl+Shift+X`)
   - Search for "Live Server" by Ritwick Dey
   - Click Install

2. **Start the server**:
   - Open `website/index.html` in VS Code
   - Right-click anywhere in the file
   - Select "Open with Live Server"
   - Browser opens automatically at `http://localhost:5500/website/`

3. **Development**:
   - Edit any HTML/CSS/JS file
   - Save the file (`Ctrl+S`)
   - Browser auto-refreshes ✨

### Alternative: Simple HTTP Server

**PowerShell:**
```powershell
cd website
python -m http.server 8000
# Visit http://localhost:8000
```

**Or with Node.js:**
```powershell
npx serve website
# Visit http://localhost:3000
```

## 📝 Making Changes

### Update Content
- **index.html** - Landing page content
- **privacy.html** - Privacy policy
- **support.html** - FAQ and support info

### Update Styles
- **styles/main.css** - All styling
- CSS variables at top (`:root` section) control colors/spacing

### Add Images
1. Add image files to `website/assets/`
2. Reference in HTML: `<img src="assets/your-image.png">`

**Important:** Update hero artwork.
- Replace `website/assets/screenshot-hero.png` with a fresh capture of the DialogDrive interface (ideal width 520–640px).
- Keep an optional secondary image at `website/assets/screenshot-popup.png` for additional callouts.

## 🎨 Design System

Colors (in CSS variables):
- Primary Blue: `--primary-color: #1f46e5`
- Secondary Text: `--text-light: #5d5f63`
- Warm Surface: `--bg-light: #fbf8f2`

## 📤 Deployment

Already configured for GitHub Pages!

1. Push changes to repository
2. GitHub Actions will deploy automatically
3. Live at: `https://nikolai-e.github.io/DialogDrive/website/`

## ⚠️ Important Notes

- Website folder is **completely separate** from extension code
- No build process needed - pure HTML/CSS/JS
- Safe to edit without affecting extension
- All links to Chrome Web Store are already configured

## 📧 Support

Email: dialogdrive@outlook.com
