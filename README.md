# Zombie Horde Runner

Original pixel-art arcade horde runner, built with Phaser 3, TypeScript and Vite.

From this folder in PowerShell:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the URL printed by Vite. Space, Up, click or tap jumps; hold for height. Escape or P pauses. Tab/arrows and Enter navigate menus. Music starts disabled; enable it in Settings. Press Ctrl+C in the terminal to stop the server.

```powershell
npm.cmd run build
npm.cmd test
```

Browser tests use installed Microsoft Edge. If using another OS, change `channel` in `playwright.config.ts` and install the corresponding Playwright browser. `node scripts/capture.cjs` captures QA evidence with the development server running.

Development only: append `?debug` for collision boxes, velocity, frame rate, object count, chunk and speed. Test handles exist only in development builds. Production builds do not expose them.

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for the audit, implementation details, verification and limitations. [DESIGN.md](DESIGN.md) records the visual system. Screenshots are under [artifacts](artifacts).
