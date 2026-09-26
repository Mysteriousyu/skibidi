# macOS Golden Gate — Web

A browser recreation of **macOS 27 "Golden Gate"** (released September 2026), built with plain HTML, CSS and JavaScript. It has no build step and no dependencies.

Open `index.html` in a browser. To skip the boot and lock screens, add `?skipboot` to the URL.

## What's inside

**System**
- Boot screen, lock screen with a large clock (any password logs you in), Sleep, Restart, Shut Down and Log Out
- Transparent Liquid Glass menu bar with the Apple menu, per-app menus, Wi-Fi and battery menus, and a clock
- Control Center with Wi-Fi, Bluetooth, AirDrop, Focus, Dark Mode, display brightness, sound, Now Playing, and the new **Liquid Glass transparency slider** (Clear ↔ Tinted) from Golden Gate
- Notification Center with calendar, weather and world-clock widgets, plus notification toasts
- Spotlight (`Ctrl+Space` or `Alt+Space`) that searches apps, files, actions and math, with web search as a fallback
- Apps launcher (the Tahoe-era replacement for Launchpad) with category filters and search
- A floating glass Dock with magnification, running-app indicators, auto-hide, right-click menus, and a minimize animation
- Windows that drag, resize from their edges and corners, and have working traffic-light buttons (close, minimize to the Dock, zoom). They share one corner radius, and the active window gets a deeper shadow, as in Golden Gate
- Desktop icons and a desktop right-click menu
- Procedurally drawn wallpapers: Golden Gate (abstract, light and dark), Golden Gate Sunset, Golden Gate Night, Celosia, Tahoe, and several gradients

**Apps**
Finder, Safari, Messages, Photos, Music (a small WebAudio synth plays the tracks), Notes, Calendar, Weather (live data from Open-Meteo when it's reachable), Calculator, Terminal, TextEdit, System Settings and About This Mac.

Finder, Terminal and TextEdit share a virtual file system that is saved in `localStorage`. For example, run `echo hi > ~/Desktop/hello.txt` in Terminal and the file appears on the desktop.

## Keyboard shortcuts

Browsers reserve most ⌘ shortcuts, so this project uses Alt instead:

| Shortcut | Action |
| --- | --- |
| `Ctrl/Alt + Space` | Spotlight |
| `Alt + W` | Close the window |
| `Alt + M` | Minimize the window |
| `Alt + Q` | Quit the app |
| `Alt + N` | New window |
| `Alt + ,` | System Settings |
| `Esc` | Close menus and overlays |

## Structure

```
index.html          shell markup
css/style.css       Liquid Glass tokens, system UI and app styles
js/icons.js         SVG app icons and UI glyphs
js/wallpapers.js    procedural SVG wallpapers
js/fs.js            virtual file system
js/wm.js            window manager
js/apps.js          built-in apps
js/system.js        menu bar, Dock, Control Center, Spotlight, boot and lock
```

## Safari's cloud browser

Most big websites refuse to load inside another page, so an iframe can't be a real browser. When the project is deployed with a [Hyperbeam](https://hyperbeam.com) API key, Safari instead streams a real Chrome browser that runs in the cloud, so every site works, including Google, YouTube and logins.

- `api/browser.js` is a Vercel serverless function. It starts and stops Hyperbeam sessions and keeps the API key on the server.
- Set these in Vercel → Project → Settings → Environment Variables, then redeploy:
  - `HYPERBEAM_API_KEY` (required)
  - `BROWSER_ACCESS_CODE` (optional, but recommended). Visitors must enter this code before a session starts, so strangers can't run up your Hyperbeam bill.
  - `BROWSER_MAX_MINUTES` (optional). Hard limit per session. The default is 30.
- A session closes when you close the Safari window or leave the page, after 10 idle minutes, or 60 seconds after everyone disconnects.
- Without the key, for example when you open `index.html` from disk, Safari falls back to basic iframe mode. Each page then gets an "Open in a new tab" link.

## Notes
- This is a fan-made learning project. It is not affiliated with Apple. Apple and macOS are trademarks of Apple Inc.
