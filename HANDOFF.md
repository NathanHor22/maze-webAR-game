# Handoff guide

## Current state

The repository contains a complete code-level implementation of **Synapze: Mind the Gap**, a three-level MindAR and Three.js mobile WebAR game. The production bundle and strict TypeScript checks should be run before every handoff. Final acceptance still requires camera and image-tracking tests on physical mobile devices.

## First-run checklist

```bash
npm install --ignore-scripts
npm run typecheck
npm run build
npm run dev
```

The Vite development server uses HTTPS and listens on the local network. Open the network address shown in the terminal on a phone connected to the same network. Ensure the phone trusts the development certificate; otherwise its browser may refuse camera access.

## Target files

- Test artwork: `public/assets/targets/mind-the-gap-target.png`
- Runtime tracking data: `public/assets/targets/mind-the-gap-target.mind`

Print the PNG on matte paper or display it on a separate screen. If the artwork changes, rebuild the tracking data:

```bash
npm run compile:target
```

Optional custom paths are supported:

```bash
npm run compile:target -- path/to/source.png path/to/output.mind
```

Keep the runtime path in `src/main.ts` aligned with the generated `.mind` file.

## Acceptance path

1. Open the app on a phone over trusted HTTPS.
2. Tap **Start AR** and grant camera permission.
3. Scan the generated target and confirm the board is anchored to it.
4. Wait for the countdown and confirm the robot begins moving automatically.
5. Tap a D-pad direction once and confirm the robot continues after release; tap before a corner and confirm the requested turn is queued until it becomes legal.
6. Collect all energy cores, avoid drones and active traps, and enter the unlocked portal.
7. Complete or inspect all three levels, including win/loss and replay controls.
8. Briefly interrupt the target view and confirm filtering, presentation smoothing, and miss tolerance prevent excessive jitter or an immediate pause. Keep it out of view and confirm a sustained loss pauses, then resumes without losing progress.
9. Test sound on/off and generated effects after a user gesture.

Desktop keyboard controls are arrow keys or WASD. Each press steers or queues a turn, and key release does not stop the robot. Desktop input is not a replacement for phone testing.

## Control and tracking behavior

- The runner always advances once gameplay begins. Touch and keyboard input select a desired direction instead of acting as held movement controls.
- A requested direction remains queued until the next legal turn point. Pointer-up, pointer-cancel, pointer-leave, and key-up events do not stop movement.
- The robot and patrol-drone models are rendered at 150% of their previous size for easier viewing on a phone.
- MindAR pose filtering is tuned at the tracking layer. Additional presentation smoothing reduces visible anchor jitter, while a longer miss tolerance bridges short detection gaps before the target-lost pause appears.

## Active architecture

| Path | Responsibility |
| --- | --- |
| `src/main.ts` | Starts AR, binds UI/input, handles countdown/results, and drives rendering |
| `src/ar/MindARSession.ts` | Owns the MindAR lifecycle, camera, renderer, scene, anchor, and target callbacks |
| `src/game/SynapzeGame.ts` | Owns game state, simulation, collision, progression, and public controls |
| `src/game/levels.ts` | Contains the three validated maze definitions |
| `src/game/models.ts` | Creates procedural Three.js models |
| `src/game/particles.ts` | Implements pooled visual bursts |
| `src/game/audio.ts` | Synthesizes WebAudio feedback |
| `src/game/types.ts` | Defines callbacks, events, snapshots, and options |
| `src/style.css` | Implements the responsive mobile HUD and overlays |
| `scripts/compile-mind-target.mjs` | Compiles PNG target artwork into `.mind` data |

The top-level legacy maze/player/control modules are not used by the active runtime. New gameplay work should target `src/game/`.

## Common maintenance

### Change a level

Edit `src/game/levels.ts`. Maps use:

- `#` wall
- `.` floor
- `S` player start
- `E` exit portal
- `C` energy core
- `K` checkpoint

The module validates required tiles, reachability, drone corridors, and trap placement when loaded.

### Change UI behavior

Edit `index.html`, `src/style.css`, and the DOM integration in `src/main.ts`. Keep gameplay decisions inside `SynapzeGame`.

### Replace the target artwork

Replace the PNG, run `npm run compile:target`, verify the configured `.mind` path, then retest tracking on multiple physical devices and under varied lighting.

## Release notes

- Build output is `dist/` and can be served by an HTTPS static host.
- No deployment URL or provider is assumed by this repository.
- Camera permission, rear-camera selection, autofocus, target stability, mobile performance, heat, and battery behavior require device testing.
- The robot, enemies, environment, particles, and audio are generated at runtime; there are no required GLB or audio asset files.
