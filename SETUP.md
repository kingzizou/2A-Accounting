# 2A Prints Accounting — Electron project source

This is the source that builds the Windows installer (`2A-Prints-Accounting-Setup-X.X.X.exe`).

## What's in here

- `index.html` — the actual app (everything lives in this one file: UI, logic, Supabase connection)
- `main.js` — Electron's main process: creates the app window, handles auto-update, and runs the
  license-registration bridge (talks to the Make.com webhook)
- `preload.js` — the narrow bridge that lets `index.html` send the license registration, without
  giving it broader access to Node/Electron
- `package.json` — dependencies plus the `build` section electron-builder reads (app name, icon,
  installer settings, where to publish releases)
- `RELEASING.md` — the step-by-step for publishing a new version once you've made changes

## First-time setup on a new machine

1. Install [Node.js](https://nodejs.org) (this was built with Node 22, but any recent LTS works).
2. Open a terminal in this folder and run:
   ```
   npm install
   ```
   This downloads Electron itself and the build tooling — not included here since it's large and
   fully reproducible from `package.json`.
3. Build the installer:
   ```
   npx electron-builder --win --publish never
   ```
   The finished installer, its `.blockmap`, and `latest.yml` land in a new `dist` folder.

If you're building on an actual Windows machine (rather than Mac/Linux), you don't need Wine or
anything extra — electron-builder targets Windows natively when it's already running on Windows.
(The Linux environment this was originally built in needed Wine specifically because it was
cross-compiling a Windows installer from Linux — that's not a normal requirement.)

## Making changes

Edit `index.html` for anything in the app itself — that's the real source of truth; every past
change in this project has been made directly to that file. `main.js`/`preload.js` only need
touching for things outside the web page itself (auto-update behavior, the license bridge
bridge, window setup).

Once you've made a change, see `RELEASING.md` for exactly how to bump the version, rebuild, and
publish it so existing installs pick it up automatically.

## License registration (replaced Paystack)

Run `license_migration.sql` once in the Supabase SQL editor. It adds the license columns to
`companies` and the `apply_license()` function the app calls after a key is approved. The license
webhook URL and developer email live at the top of the license block in `index.html`
(`LICENSE_WEBHOOK_URL`, `DEVELOPER_EMAIL`).
