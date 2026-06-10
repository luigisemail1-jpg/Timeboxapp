# Daily Timeboxing Planner

Your personal timeboxing app. This guide gets you from the zip file to a working app on both your computer and your phone — no terminal required.

---

## ✅ Easiest path: StackBlitz (browser-based, ~10 minutes)

This option requires **no installs and no GitHub account**.

### Step 1 — Open StackBlitz
1. Go to **https://stackblitz.com**
2. Click **Sign up** (you can use Google / GitHub / email — free).

### Step 2 — Upload this project
1. On the StackBlitz dashboard, click the **"+"** button (top left) → **"Upload Project"**.
   - If you don't see "Upload Project", click **"New project"** → **"Vite"** → **"React"** to create a starter, then drag this folder's files into the file tree on the left, replacing the existing ones.
2. Drag this entire folder (the one containing `package.json`, `index.html`, `src/`, `public/`) into the upload window.
3. Wait ~30 seconds while it installs dependencies. A live preview will appear on the right.

### Step 3 — Get your URL
1. Click **"Connect Repository"** or **"Deploy"** in the top toolbar (StackBlitz changes this UI occasionally — look for a deploy/share button).
2. Choose **Netlify** as the deploy target (it's the simplest free option).
3. Click **"Deploy"**. After about a minute you'll get a URL like `https://your-planner-abc123.netlify.app`.

### Step 4 — Add to your devices

**Desktop:**
- Just bookmark the URL.
- Or in Chrome: click the install icon in the address bar (looks like a monitor with a down arrow) to install it as a desktop app.

**iPhone:**
1. Open the URL in **Safari** (must be Safari, not Chrome).
2. Tap the **Share** button (square with up arrow).
3. Scroll down → tap **"Add to Home Screen"**.
4. The app icon appears on your home screen and opens fullscreen, like a real app.

**Android:**
1. Open the URL in **Chrome**.
2. Tap the three-dot menu → **"Install app"** (or "Add to Home Screen").
3. Done.

---

## 🛠 Alternative: Run locally on your computer first

If you'd rather test it on your computer before putting it online:

### Prerequisites
Install **Node.js** (free): https://nodejs.org → download the "LTS" version → run the installer.

### Run the app
1. Open Terminal (Mac) or Command Prompt (Windows).
2. Navigate to this folder:
   ```
   cd path/to/this/folder
   ```
3. Run:
   ```
   npm install
   npm run dev
   ```
4. Open the URL it prints (usually http://localhost:5173) in your browser.

To deploy later: see the StackBlitz steps above, or use **Netlify Drop** (https://app.netlify.com/drop) — drag the `dist` folder (created by running `npm run build`) onto their page for an instant URL.

---

## 📝 Notes

- **Your data is private.** Everything saves to your device's browser storage (localStorage). It never leaves your phone or computer.
- **Each device is separate.** If you want your planner synced across phone and laptop, that's a future project (would need a backend like Firebase).
- **Clearing your browser data will erase your planner entries.** Back up important info elsewhere.

---

## Files in this project

```
.
├── index.html              ← entry HTML
├── package.json            ← dependencies
├── vite.config.js          ← build config
├── public/
│   ├── manifest.webmanifest ← makes "Add to Home Screen" feel native
│   ├── icon.svg
│   ├── icon-192.png
│   └── icon-512.png
└── src/
    ├── main.jsx            ← React entry point
    └── App.jsx             ← the planner itself
```

Have fun!
