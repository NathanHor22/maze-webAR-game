# Synapze: Mind the Gap

Synapze is a mobile WebAR maze adventure built with MindAR, Three.js, TypeScript, and Vite. Scan the supplied image target to place a miniature game board on it, guide the robot through three levels, collect every energy core, and reach the unlocked portal.

The game uses procedural Three.js geometry for the robot, walls, drones, traps, collectibles, portal, and particle effects. Its sound effects are synthesized with WebAudio, so no model or audio downloads are required after the app loads.

## Features

- MindAR image tracking with a compiled `.mind` target
- Three handcrafted maze levels with distinct palettes and time limits
- Fixed-step movement and grid collision
- Animated robot, patrol drones, pulse traps, checkpoints, and exit portals
- Energy-core collection, lives, score, timer, and one-to-three-star results
- Touch D-pad, dash ability, sound toggle, and keyboard controls
- Automatic pause while the image target is lost
- Restart, replay, and next-level flows
- Mobile-first UI with safe-area and reduced-motion support

## Requirements

- A current Node.js release
- A modern mobile browser with camera access
- HTTPS or another browser-recognized secure context
- The printed target, or a second screen displaying it

Camera permission and image-tracking quality cannot be validated by a desktop build alone. Test the finished experience on the intended phones and tablets.

## Install and run

```bash
npm install --ignore-scripts
npm run typecheck
npm run dev
```

Vite serves the project over HTTPS on port `5173` and exposes it to the local network. Open the network address shown by Vite on a phone connected to the same network. The certificate must be trusted by the phone before its browser will grant camera access.

For a production build:

```bash
npm run build
npm run preview
```

Deploy the generated `dist/` directory to an HTTPS static host. This repository does not assume a deployment provider or URL.

## Tracking target

The repository includes both parts required for testing:

- Printable/displayable artwork: `public/assets/targets/mind-the-gap-target.png`
- MindAR tracking data loaded by the app: `public/assets/targets/mind-the-gap-target.mind`

Print the PNG flat on matte paper, or show it at a large size on another screen. Keep the full artwork visible with even lighting and minimal glare.

If the PNG changes, regenerate the compiled target before building:

```bash
npm run compile:target
```

The command reads the PNG and overwrites the `.mind` file at the paths above. It also accepts optional input and output paths:

```bash
npm run compile:target -- path/to/source.png path/to/output.mind
```

## How to play

1. Open the app and tap **Start AR**.
2. Allow camera access.
3. Point the camera at `mind-the-gap-target.png` and keep the full target in view.
4. After the countdown, hold the D-pad to move the robot.
5. Collect every glowing energy core while avoiding drones and active traps.
6. Use **Dash** for a short speed burst when available.
7. Enter the portal after it unlocks.
8. Complete all three levels and improve your time and star rating.

If tracking is lost during play, the timer and simulation pause. Reacquire the target to continue from the same state.

Desktop controls use the arrow keys or WASD to move and Space to dash.

## Commands

| Command | Purpose |
| --- | --- |
| `npm install --ignore-scripts` | Install the pinned dependencies without running package lifecycle scripts |
| `npm run dev` | Start the HTTPS Vite development server |
| `npm run typecheck` | Run strict TypeScript validation |
| `npm run build` | Create the production bundle in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run compile:target` | Compile the test-target PNG into MindAR `.mind` data |

## Architecture

```text
index.html                         Mobile UI and game-state overlays
src/main.ts                        AR startup, UI bindings, countdown, and render loop
src/style.css                      Responsive WebAR presentation
src/ar/MindARSession.ts            Typed MindAR lifecycle and target-event adapter
src/ar/index.ts                    AR module exports
src/game/SynapzeGame.ts            Simulation, progression, collision, and public API
src/game/levels.ts                 Three level definitions and authoring validation
src/game/models.ts                 Procedural low-poly Three.js models
src/game/particles.ts              Lightweight particle pool
src/game/audio.ts                  Generated WebAudio cues
src/game/types.ts                  Game callbacks, events, snapshots, and options
scripts/compile-mind-target.mjs     Node-based target compiler
public/assets/targets/              Test artwork and compiled tracking data
```

`MindARSession` owns the camera, renderer, scene, and image anchor. `SynapzeGame` attaches its tabletop root to that anchor and exposes input, update, tracking visibility, restart, and level-progression methods. `src/main.ts` connects those systems to the DOM without placing UI concerns in the game core.

## Troubleshooting

### Camera does not start

- Confirm the page is a trusted HTTPS context.
- Allow camera access in the browser's site settings.
- Close other apps using the camera, then reload.
- Prefer a rear-facing camera on a physical phone.

### Target does not lock or drifts

- Keep the entire target inside the camera frame.
- Use bright, even light and avoid reflections.
- Keep the print or display flat and still.
- Increase the displayed or printed target size.
- Test on more than one device; camera focus and tracking performance vary.

### Game board disappears

This is expected when the target is obscured or leaves the frame. Gameplay pauses until tracking returns.

## License

MIT
