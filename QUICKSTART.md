# 🚀 QUICK START GUIDE

## Run the Game (3 Steps)

### 1. Start Dev Server
```bash
npm run dev
```

This will start the server at `https://localhost:5173`

### 2. Print the Tracking Card

Open `/assets/targets/tracking-target.png` and print it:
- **Size**: At least 15cm × 15cm (bigger is better)
- **Paper**: Regular printer paper (matte finish preferred)
- **Color**: Black & white is fine

**OR** display the image fullscreen on your laptop for quick testing.

### 3. Test on Your Phone

**Option A: Same WiFi Network**
1. Find your computer's IP address:
   - Mac: Open Terminal → `ifconfig | grep inet` → Look for 192.168.x.x
   - Windows: Open Command Prompt → `ipconfig` → Look for IPv4 Address
2. On your phone browser, go to: `https://YOUR_IP:5173`
3. Accept the security warning (self-signed certificate)
4. Grant camera permissions
5. Point camera at tracking card

**Option B: Using ngrok (If WiFi doesn't work)**
```bash
# Install ngrok
npm install -g ngrok

# In another terminal (keep dev server running)
ngrok http 5173
```
Then visit the `https://` URL on your phone.

## 🎮 Controls

- **▲** Move forward
- **▼** Move backward  
- **◀** Move left
- **▶** Move right

**Goal**: Navigate the red ball to the green exit circle!

## 🐛 Troubleshooting

### "Camera not working"
- Make sure you're using **HTTPS** (not HTTP)
- Grant camera permissions when prompted
- Try Chrome or Safari (best WebAR support)

### "Tracking won't lock"
- Ensure good lighting (not too dark or bright)
- Hold card flat and steady
- Make sure the entire card is visible
- Print larger (20cm+ works better)

### "Buttons not responding"
- Make sure the tracking is active (green status badge)
- Try tapping the button area firmly
- Check browser console (F12) for errors

## 📝 Next Steps

Want to customize the game?

- **Change maze layout**: Edit `src/maze.ts` → `MAZE_LAYOUT` array
- **Adjust difficulty**: Change `CELL_SIZE` or maze size
- **Style the UI**: Edit `src/style.css`
- **Add features**: Add sound effects, timers, scores, etc.

Check the full README.md for detailed documentation!
