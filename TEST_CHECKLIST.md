# ✅ Testing Checklist

Use this checklist to verify everything works before deploying.

## Pre-Flight Checks

### 1. Development Server
```bash
cd /maze-webAR-game
npm run dev
```

- [ ] Server starts without errors
- [ ] Shows `https://localhost:5173/`
- [ ] Shows network IP address
- [ ] No compilation errors in terminal

### 2. Tracking Card Preparation
- [ ] Located file: `assets/targets/tracking-target.png`
- [ ] Printed on A4 paper (15cm × 15cm minimum)
- [ ] OR displayed fullscreen on laptop
- [ ] Image is clear and high-contrast

## Desktop Browser Test

Open `https://localhost:5173` in Chrome/Safari

- [ ] Page loads without errors
- [ ] Can see the 4 control buttons (bottom-right)
- [ ] Can see status badge (top center)
- [ ] Can see move counter (below status)
- [ ] Console shows: "🎮 AR Maze Game Initialized!"
- [ ] Console shows: "🎮 Controls initialized"

## Mobile Phone Test

### Setup
- [ ] Phone and computer on same WiFi
- [ ] Found computer's IP address
- [ ] Opened `https://YOUR_IP:5173` on phone
- [ ] Accepted security certificate warning
- [ ] Granted camera permissions

### AR Tracking
- [ ] Camera view appears
- [ ] Status shows "Point camera at tracking card"
- [ ] Pointed phone at tracking card
- [ ] Status changes to "Tracking Active" (green)
- [ ] Can see the maze appear on the card
- [ ] Can see the red ball character
- [ ] Can see the green exit marker

### Game Controls
- [ ] Buttons visible on screen
- [ ] Buttons don't move when tilting phone (screen-anchored ✓)
- [ ] Tapping UP button moves ball forward
- [ ] Tapping DOWN button moves ball backward
- [ ] Tapping LEFT button moves ball left
- [ ] Tapping RIGHT button moves ball right
- [ ] Move counter increases with each move

### Collision Detection
- [ ] Ball CANNOT move through yellow walls
- [ ] Ball CAN move through open paths
- [ ] Ball smoothly animates between positions
- [ ] Ball has floating idle animation when not moving

### Win Condition
- [ ] Ball reaches green exit circle
- [ ] Win message appears
- [ ] Shows final move count
- [ ] "Play Again" button appears
- [ ] Clicking "Play Again" resets game
- [ ] Ball returns to start position
- [ ] Move counter resets to 0

## Edge Cases

### Tracking Stability
- [ ] Tracking maintains when moving phone slightly
- [ ] Tracking recovers after brief occlusion (cover card with hand)
- [ ] Maze stays aligned to card (doesn't drift)
- [ ] Works in different lighting conditions

### UI Responsiveness
- [ ] Buttons respond immediately to touch
- [ ] No lag between tap and movement
- [ ] Visual feedback on button press (color change)
- [ ] Status updates in real-time

### Performance
- [ ] Runs at 30+ FPS (smooth animation)
- [ ] No stuttering or lag
- [ ] Battery drain is acceptable
- [ ] No overheating after 5 minutes

## Browser Compatibility

Test on multiple browsers:
- [ ] Chrome (Android) - Recommended
- [ ] Safari (iOS) - Recommended
- [ ] Firefox (Android)
- [ ] Edge (Android)

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Camera black screen | Reload page, re-grant permissions |
| Tracking won't lock | Better lighting, larger print |
| Buttons not responding | Check tracking is active (green) |
| Game won't start | Check console for errors (F12) |
| Certificate warning | Normal - click "Proceed anyway" |

## Deployment Verification

After deploying to production:

- [ ] Deployed URL loads
- [ ] HTTPS certificate is valid (or accepted)
- [ ] Camera permissions work
- [ ] Tracking works same as localhost
- [ ] All game features functional
- [ ] Mobile performance acceptable

## Final Sign-Off

When all checks pass:

```bash
# Push to GitHub
git push -u origin main

# Deploy
npm run build
./deploy.sh
```

- [ ] Code pushed to GitHub
- [ ] Live URL shared with team
- [ ] Tracking card PDF shared
- [ ] Demo video recorded (optional)

---

**Tester**: _____________  
**Date**: _____________  
**Status**: ⬜ PASS / ⬜ FAIL  
**Notes**: 

