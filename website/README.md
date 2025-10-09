# DialogDrive Website

This is the promotional landing page for the DialogDrive Chrome extension.

## 🌐 Live Site

The site will be hosted at: `https://nikolai-e.github.io/DialogDrive/website/`

## 📁 Structure

```
website/
├── index.html          # Landing page
├── privacy.html        # Privacy policy
├── styles/
│   └── main.css        # All styles
├── scripts/
│   └── main.js         # Interactive features
└── assets/
    ├── icon-128.png         # Extension icon
    ├── screenshot-hero.png  # High-fidelity UI hero image
    └── screenshot-popup.png # Optional secondary imagery
```

## 🚀 Local Development

### Option 1: Live Server Extension (Recommended)

1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code
2. Open `website/index.html`
3. Right-click anywhere in the file and select "Open with Live Server"
4. Your browser will open at `http://localhost:5500/website/`
5. Changes auto-reload on save ✨

### Option 2: Python HTTP Server

```powershell
cd website
python -m http.server 8000
# Visit http://localhost:8000
```

### Option 3: Node.js HTTP Server

```powershell
npx serve website
# Visit http://localhost:3000
```

## 📸 Adding Screenshots

Primary hero artwork lives at `website/assets/screenshot-hero.png`. Replace this with your updated UI capture (ideally 520-640px wide, transparent background optional).

Secondary imagery (e.g., popup or sidepanel close-ups) can live alongside as additional PNGs. Reference them inside `index.html` or supporting pages when needed.

## 🎨 Customization

- **Colors**: Adjust the `:root` design tokens in `styles/main.css`
- **Components**: Hero, flow sections, and the charcoal CTA band each have dedicated classes for spacing, typography, and background treatments
- **Images**: Update assets in `assets/` and reference via `<img src="assets/...">`

## 🚢 Deployment (GitHub Pages)

This site is designed to be hosted on GitHub Pages:

1. Push the `website/` folder to your repository
2. Go to repository Settings → Pages
3. Set source to your branch (e.g., `main` or `UI`)
4. Set folder to `/website` (or `/` if website is at root)
5. Save and wait for deployment

Your site will be live at: `https://nikolai-e.github.io/DialogDrive/website/`

## 📝 Content Updates

- **Privacy Policy**: Based on `PRIVACY_POLICY.md` in the root
- **Narrative**: Update the flowing copy blocks in `index.html`

## ⚠️ Important

This website is completely separate from the extension code:
- No dependencies on extension build process
- Can be edited without affecting the extension
- Pure static HTML/CSS/JS - no build step required

## 📧 Contact

Email: dialogdrive@outlook.com
