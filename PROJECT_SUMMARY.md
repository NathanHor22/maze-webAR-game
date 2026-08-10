# Project summary

## Product

**Synapze: Mind the Gap** is a mobile image-tracked WebAR maze game. MindAR anchors a Three.js tabletop board to the supplied test image. The player steers an automatically moving robot, gathers energy cores, avoids hazards, and unlocks the portal across three handcrafted levels.

## Current feature set

### AR runtime

- MindAR image tracking with one compiled image target and tuned tracking filters
- Presentation-layer anchor smoothing and a longer brief-miss tolerance to reduce visible jitter and unnecessary pauses
- Explicit **Start AR** gesture before camera access
- Loading, scanning, permission-error, target-found, and target-lost UI states
- Automatic simulation and timer pause when tracking is lost
- Restartable camera/session adapter with target event callbacks
- HTTPS Vite development server for mobile testing

### Game

- Three authored maze levels with increasing patrol and trap pressure
- Fixed-step automatic movement with grid-wall collision and queued Pac-Man-style turns
- Energy cores, checkpoint respawns, locked portals, lives, score, timer, and stars
- Patrol drones and timed pulse-spike traps
- Tap-to-steer D-pad, press-to-steer keyboard input, and sound preference; releasing input does not stop movement
- Win, loss, replay, next-level, and return-to-scan flows
- Best-time storage per level in the browser

### Presentation

- Procedural low-poly robot and patrol drones enlarged by 50%, plus walls, floor, cells, traps, checkpoint, and portal
- Lightweight pooled particles
- Synthesized WebAudio cues with no external audio files
- Responsive mobile UI with safe-area handling and reduced-motion support

## Tracking assets

| Asset | Purpose |
| --- | --- |
| `public/assets/targets/mind-the-gap-target.png` | Generated artwork to print or display during testing |
| `public/assets/targets/mind-the-gap-target.mind` | Compiled MindAR tracking data loaded at runtime |
| `scripts/compile-mind-target.mjs` | Rebuilds `.mind` data from the PNG |

Recompile after changing the source artwork:

```bash
npm run compile:target
```

## Architecture

```text
Browser UI
  index.html + src/style.css
           |
           v
Integration layer
  src/main.ts
     |             |
     v             v
AR adapter       Game core
  src/ar/          src/game/
     |             |
     +------ Three.js scene/anchor
                  |
             MindAR camera
```

- `src/main.ts` binds DOM controls, countdowns, result screens, sound preference, and the render loop.
- `src/ar/MindARSession.ts` contains the MindAR-specific lifecycle boundary and exposes the scene, camera, renderer, and anchor group.
- `src/game/SynapzeGame.ts` owns state, fixed-step updates, collision, hazards, score, and progression.
- `src/game/levels.ts` defines and validates all three maps.
- `src/game/models.ts`, `particles.ts`, and `audio.ts` provide the asset-free presentation.
- `src/game/types.ts` documents the host callback and snapshot contract.

The older top-level maze, player, and control modules are not part of the active runtime; the integrated experience uses `src/game/`.

## Development workflow

```bash
npm install --ignore-scripts
npm run typecheck
npm run dev
npm run build
```

Use `npm run preview` to inspect a production bundle locally. The app must ultimately be hosted in a trusted HTTPS context for camera access.

## Technology

| Technology | Role |
| --- | --- |
| MindAR | Browser image tracking |
| Three.js | Rendering and procedural models |
| TypeScript | Strict application and game types |
| Vite | HTTPS development server and production bundling |
| WebAudio | Runtime-generated sound cues |

## Current limitation

Automated typechecks and builds verify code and bundling, but they cannot validate camera permission, physical-target quality, focus behavior, tracking stability, thermal load, or mobile frame rate. Real-device camera testing over HTTPS remains required before release. The included generated image is a practical test target and can be replaced with final artwork by recompiling the `.mind` file.
