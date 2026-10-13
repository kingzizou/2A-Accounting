# Publishing releases (so auto-update works)

This app now checks `github.com/kingzizou/2A-Accounting-releases` (the public releases-only repository) for new versions
automatically — every ~4 hours while running, and shortly after each launch. When it
finds one, it downloads it quietly in the background, then asks the person "Restart
now to install?" once it's ready.

## First time only: install this version manually

Auto-update only updates an *already-installed* copy — the very first install always
has to be manual. Run **`2A-Prints-Accounting-Setup-1.0.0.exe`** yourself (or send it
to your first customers) — it installs properly now, with a Start Menu shortcut and
an uninstaller, not just a folder to unzip.

## Every time after that: publishing a new version

1. Make your code changes to `index.html` (or wherever you're editing the app).
2. Open `package.json` and bump the version number — e.g. `"version": "1.0.0"` →
   `"version": "1.0.1"`. This number is exactly what tells everyone's installed app
   "there's something newer."
3. Rebuild the installer:
   ```
   npx electron-builder --win --publish never
   ```
   This produces three files in `dist/`:
   - `2A-Prints-Accounting-Setup-1.0.1.exe` (rename it to swap spaces for hyphens if
     electron-builder gives it spaces — check `latest.yml`'s `url:` line for the exact
     name it expects, and make the actual file match exactly)
   - `2A-Prints-Accounting-Setup-1.0.1.exe.blockmap`
   - `latest.yml`
4. Go to `github.com/kingzizou/2A-Accounting-releases` (the public releases-only repository) → **Releases** → **Draft a new
   release**.
5. **Tag**: `v1.0.1` (must match the version you set in step 2, with a `v` in front).
6. Upload all three files from step 3 as release assets (drag and drop them in).
7. Click **Publish release**.

That's it — no server to restart, nothing else to configure. Within a few hours,
everyone's app notices the new release exists, downloads it in the background, and
offers to restart and install.

## A few things worth knowing

- **Test on your own machine first.** Install the previous version, publish the new
  one following the steps above, then leave the old version running for a bit (or
  trigger a check by restarting it) to confirm it actually picks up the update before
  you tell customers about it.
- **Version numbers must always go up.** `1.0.1` → `1.0.2` → `1.1.0`, never backward
  — electron-updater compares numbers, not dates, to decide what counts as "newer."
- **The three files must all come from the same build.** Don't mix an installer from
  one build with a `latest.yml` from another — the sha512 hashes inside `latest.yml`
  must match the actual installer file exactly, or the update will fail a checksum
  check and silently refuse to install.
- **Don't delete old releases** right away — if someone's offline for weeks and comes
  back on a very old version, having the release history intact makes it easier to
  debug if something goes wrong. It's fine to delete very old ones eventually.
