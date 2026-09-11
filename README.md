# CODE SOCIAL — Windows Desktop Application (Phase 1)

> **"Your code is your profile."**

A developer-first social network built around what engineers actually build, running as a native Windows desktop application via **React 19 + Vite + TypeScript** packaged with **PyWebView (Microsoft Edge WebView2)**.

---

## Visual Direction: Clean, Light, Minimal

- **Background**: Soft off-white canvas (`#f8fafc`).
- **Cards**: Crisp white surfaces (`#ffffff`) with subtle slate borders (`#e2e8f0`) and soft shadows.
- **Accent**: Refined modern blue (`#2563eb`) with soft blue tint backgrounds (`#eff6ff`).
- **Airy Proportions**: Ample whitespace, calm visual hierarchy, restrained typography, and developer-first content.

---

## Quick Start on Windows

In `d:\codershub`:

```powershell
# 1. Launch the Native Windows Desktop App (1440 × 900)
python main.py

# 2. Live Development with Vite Hot-Reload
python main.py --dev

# 3. Direct Browser Development
npm run dev
```

---

## Desktop Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Universal search across Developers, Projects, Tech, and Build Logs |
| `Esc` | Close any open modal or return from project/developer view |
| `Ctrl+B` | Open **"I BUILT SOMETHING"** creation sheet |

---

## Architecture & Technology Stack (Phase 1)

```text
               Windows 10 / 11
                     │
         Python Launcher (main.py)
                     │
      PyWebView (Edge WebView2 Engine)
                     │
     React 19 + TypeScript + Tailwind
                     │
            Zustand Client State
         (Persistent in LocalStorage)
```

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Zustand, Framer Motion, Lucide React.
- **Desktop Shell**: Python 3, PyWebView with Microsoft Edge WebView2.
- **Platform Separation**: Clean, platform-independent React frontend. Android and Capacitor dependencies are strictly reserved for Phase 2.

---

## Core Product Pillars

1. **HOME**: Feed of real engineering build logs with changelogs, commit hashes (`a81f3ce`), diff snippets (`+`/`-`), Fire reactions 🔥, expandable comments 💬, and Fork triggers ⑂.
2. **DISCOVER**: Tabbed explorer for Builders by specialty (*AI, Rust, Systems, Frontend, Backend, OSS, Mobile*), living projects by domain, and active technical pulse.
3. **BUILD**: Central elevated **`+ BUILD`** action ("I built something") to publish build logs, new projects, and software releases.
4. **PROFILE**: Shows **Currently Building** with live progress (`NovaAI 82%`), verifiable **Proof of Work** metrics, core tech stack, and shipped projects.
5. **FORK / COLLABORATION**:
   - **Fork Project**: "I want to build on this" (e.g. `NovaAI` → `NovaAI-Mobile`).
   - **Join Project**: Contributor opportunities with role selection and application flow.
