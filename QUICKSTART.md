# Quick start

## 1. Install and verify

```bash
npm install --ignore-scripts
npm run typecheck
npm run build
```

## 2. Start the HTTPS development server

```bash
npm run dev
```

Use the HTTPS network address printed by Vite. Connect the test phone to the same network and make sure its browser trusts the local certificate. Camera access will not work from an ordinary insecure network URL.

## 3. Open the target

Print or display:

```text
public/assets/targets/mind-the-gap-target.png
```

The app loads its matching compiled data from:

```text
public/assets/targets/mind-the-gap-target.mind
```

Use matte paper or a bright second screen. Keep the artwork flat, fully visible, and free of glare.

If you replace the PNG, compile it again before testing:

```bash
npm run compile:target
```

## 4. Play on a phone

1. Open the app and tap **Start AR**.
2. Grant camera permission.
3. Aim at the test target and wait for the tracking lock and countdown.
4. The robot moves automatically after the countdown. Tap a D-pad arrow once to steer; releasing it does not stop the robot.
5. Tap the next direction before a corner to queue that turn until the path opens.
6. Collect every energy core, avoid drones and pulse traps, then enter the unlocked portal.
7. Use the sound button to mute or restore generated audio cues.

There are three levels. The robot and patrol drones are 50% larger for clearer mobile viewing. Tracking uses tuned filtering, presentation smoothing, and a longer brief-miss tolerance; a sustained target loss still pauses movement and the timer until you aim back at it.

Keyboard testing is also available: press an arrow key or WASD once to steer or queue a turn. Key release does not stop movement.

## Common problems

- **No camera:** verify HTTPS, browser permission, and that another app is not using the camera.
- **No tracking lock:** show the whole target, improve lighting, reduce glare, and try a larger print/display.
- **Board vanishes:** reacquire the target; this is the intended target-loss pause behavior.
- **Desktop build succeeds but phone fails:** builds cannot exercise real camera permissions, focus, or tracking. Test on the intended mobile devices.

For a production artifact, run `npm run build` and deploy `dist/` to an HTTPS static host.
