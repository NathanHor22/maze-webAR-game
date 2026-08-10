# Test checklist

Record the phone model, OS, browser/version, target size, and lighting conditions for every device pass.

## Automated checks

- [ ] Install succeeds with `npm install --ignore-scripts`
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] `npm run compile:target` rebuilds `public/assets/targets/mind-the-gap-target.mind`
- [ ] `npm run dev` starts the HTTPS Vite server
- [ ] Production output is written to `dist/`
- [ ] Browser console has no startup or render-loop errors

## Target assets

- [ ] `public/assets/targets/mind-the-gap-target.png` opens correctly
- [ ] `public/assets/targets/mind-the-gap-target.mind` is present and non-empty
- [ ] Printed target is flat, sharp, and free of glossy reflections
- [ ] Screen-displayed target is large, bright, and unobstructed
- [ ] Full target can remain inside the rear-camera frame at a comfortable distance
- [ ] Recompiled `.mind` data is committed whenever the PNG changes

## HTTPS and camera startup

- [ ] Phone opens the HTTPS network address shown by Vite
- [ ] Development certificate is trusted by the phone
- [ ] **Start AR** is visible before camera permission is requested
- [ ] Tapping **Start AR** prompts for camera access
- [ ] Allowing permission opens the camera and scanning state
- [ ] Denying permission shows an understandable error and retry action
- [ ] Retrying after permission is enabled starts AR successfully
- [ ] Missing/in-use camera failures do not leave controls active

## Image tracking

- [ ] Scanner recognizes `mind-the-gap-target.png`
- [ ] Tabletop board appears aligned with the image plane
- [ ] Board remains reasonably stable during slow phone movement
- [ ] Tracking works with the target printed on matte paper
- [ ] Tracking works when the target is displayed on a second screen
- [ ] Brief partial occlusion is handled without resetting the level
- [ ] Moving the target out of frame shows the target-lost state
- [ ] Target loss pauses the game timer and hazards
- [ ] Reacquiring the target resumes the same game state
- [ ] Initial target loss before countdown returns cleanly to scanning

## Start and controls

- [ ] First tracking lock starts the visible countdown
- [ ] D-pad remains screen-anchored while the board tracks
- [ ] Holding Up moves toward the top of the maze
- [ ] Holding Down moves toward the bottom of the maze
- [ ] Holding Left and Right moves in the expected directions
- [ ] Diagonal multi-touch input is normalized
- [ ] Releasing, cancelling, or leaving a D-pad button stops that direction
- [ ] Robot cannot pass through maze walls or outside the board
- [ ] **Dash** produces a short speed burst
- [ ] Dash button enters cooldown and becomes available again
- [ ] Arrow keys/WASD and Space work during desktop testing
- [ ] Losing focus releases held movement

## Game mechanics

- [ ] Robot has visible idle and walking animation
- [ ] Energy cores animate and disappear when collected
- [ ] HUD core count matches the level total
- [ ] Portal stays locked until every core is collected
- [ ] Portal changes appearance when it unlocks
- [ ] Entering an unlocked portal wins the level
- [ ] Patrol drones follow their corridors without crossing walls
- [ ] Active traps damage the robot; inactive traps do not
- [ ] Damage removes a life and respawns at start or checkpoint
- [ ] Temporary post-hit invulnerability prevents immediate repeated damage
- [ ] Running out of lives shows the loss result
- [ ] Running out of time shows the loss result
- [ ] Score and remaining time update correctly
- [ ] Win result shows elapsed time, collected cores, and one to three stars
- [ ] Best time is retained per level after reload when storage is available

## Level progression

- [ ] Level 1, **Signal Garden**, is reachable from start to all cores and exit
- [ ] Level 2, **Crossed Circuits**, loads after completing level 1
- [ ] Level 3, **The Mind Gap**, loads after completing level 2
- [ ] Each level uses its expected palette, core count, drones, traps, and timer
- [ ] Replay from a win result resets the current level
- [ ] Replay from a loss result resets lives, timer, actors, and collectibles
- [ ] Next Level preserves intended campaign progression
- [ ] Final-level completion does not offer a nonexistent next level
- [ ] Return to Scan clears overlays and waits for the target again

## Models, effects, and audio

- [ ] Procedural robot, walls, portal, drones, traps, and cells render correctly
- [ ] Collection, hit, unlock, and win particles appear without obvious frame drops
- [ ] Audio begins only after a user gesture
- [ ] Collection, checkpoint, hit, portal, win, and loss cues are audible
- [ ] Sound toggle mutes and restores cues
- [ ] Sound preference persists when browser storage is available
- [ ] Muted play remains fully functional

## Responsive UI and accessibility

- [ ] Portrait layout leaves controls clear of the browser UI and safe areas
- [ ] Landscape layout keeps the HUD, target prompt, and controls usable
- [ ] Start, scan, countdown, pause, win, loss, and camera-error states do not overlap
- [ ] Buttons have visible pressed/focus states and readable labels
- [ ] HUD remains legible against bright and dark camera backgrounds
- [ ] Reduced-motion preference removes nonessential UI motion without breaking feedback
- [ ] High-contrast mode remains usable
- [ ] Screen rotation during scanning and play does not break rendering or input

## Mobile performance

- [ ] Test on at least one current Android/Chrome device
- [ ] Test on at least one current iPhone/Safari device
- [ ] Gameplay remains smooth with all drones, traps, and particles visible
- [ ] No major tracking/render hitch occurs after target reacquisition
- [ ] Five minutes of play does not cause unacceptable heat or battery drain
- [ ] Page reload and repeated camera retry do not leave duplicate video/canvas elements
- [ ] Leaving the page releases camera access

## Production-host check

- [ ] `dist/` is deployed to a trusted HTTPS origin
- [ ] Page, `.mind` data, and target preview return successfully
- [ ] Camera permission works on the hosted origin
- [ ] All three levels behave the same as the local build
- [ ] No deployment URL is hard-coded into source or documentation

## Sign-off

Automated checks cannot validate physical camera behavior or tracking quality. Do not mark the release complete until the real-device sections above pass.

- Tester:
- Date:
- Device/browser:
- Target format and size:
- Result: PASS / FAIL
- Notes:
