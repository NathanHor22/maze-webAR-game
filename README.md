# 🎮 AR Maze Game

A WebAR maze game using ZapWorks image tracking. Navigate a ball through a 3D maze displayed on a physical tracking card.

![AR Maze Game](https://img.shields.io/badge/AR-WebAR-blue) ![ZapWorks](https://img.shields.io/badge/ZapWorks-Three.js-green) ![License](https://img.shields.io/badge/license-MIT-orange)

## 🎯 Features

- ✅ **Image Tracking** - Works on any conference lanyard or card
- ✅ **3D Maze** - Navigate through walls with collision detection
- ✅ **Touch Controls** - Screen-anchored directional buttons
- ✅ **Win State** - Reach the exit to complete the maze
- ✅ **Mobile-First** - Optimized for phones and tablets
- ✅ **No App Required** - Pure WebAR, works in browser

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ ([Download here](https://nodejs.org/))
- A modern smartphone (iOS/Android)
- Printer (to print the tracking card)

### Installation

```bash
# Clone the repository
git clone https://github.com/NathanHor22/maze-webAR-game.git
cd maze-webAR-game

# Install dependencies
npm install

# Start development server
npm run dev
```

The dev server will start at `https://localhost:5173`

### 📱 Testing on Your Phone

1. **Make sure your phone and computer are on the same WiFi network**
2. Find your computer's local IP address:
   - Mac: `ifconfig | grep inet`
   - Windows: `ipconfig`
3. On your phone, visit: `https://YOUR_IP:5173`
4. Accept the security warning (self-signed certificate)
5. Grant camera permissions
6. Point your camera at the tracking card

## 🖼️ Tracking Card Setup

### Option 1: Print the Tracking Target

1. Download the tracking image from `/public/targets/tracking-card.png` (will be generated)
2. Print on A4/Letter paper (at least 15cm × 10cm)
3. For best results: matte finish, no glare

### Option 2: Display on Screen

For quick testing, display the tracking image fullscreen on your laptop and point your phone at it.

## 🎮 How to Play

1. **Scan the tracking card** - Point camera at printed card
2. **Wait for tracking lock** - Green status indicator appears
3. **Navigate the maze** - Use the 4 directional buttons:
   - ▲ Move forward
   - ▼ Move backward
   - ◀ Move left
   - ▶ Move right
4. **Reach the exit** - Green glowing circle is the goal
5. **Win!** - Complete in as few moves as possible

## 📁 Project Structure

```
maze-webAR-game/
├── src/
│   ├── main.ts          # AR initialization & game loop
│   ├── maze.ts          # Maze generation & collision
│   ├── player.ts        # Player character (ball)
│   ├── controls.ts      # Button input handling
│   ├── style.css        # UI styling
│   └── index.html       # HTML entry point
├── assets/
│   └── targets/         # Tracking images
├── public/              # Static assets
├── package.json
├── vite.config.js       # Dev server config
├── tsconfig.json        # TypeScript config
└── README.md
```

## 🛠️ Development

### Building for Production

```bash
npm run build
```

Output goes to `/dist` folder - deploy this to any static host.

### Deployment Options

#### Netlify (Recommended)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod
```

#### GitHub Pages
```bash
# Build
npm run build

# Push dist folder to gh-pages branch
git subtree push --prefix dist origin gh-pages
```

#### Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

## 🧩 Customizing the Maze

Edit `src/maze.ts` to change the maze layout:

```typescript
const MAZE_LAYOUT = [
  [1, 1, 1, 1, 1],  // 1 = wall
  [1, 0, 0, 0, 1],  // 0 = path
  [1, 0, 1, 0, 1],
  [1, 0, 0, 0, 2],  // 2 = exit
  [1, 1, 1, 1, 1]
];
```

### Adjusting Difficulty

- **Cell size**: Change `CELL_SIZE` in `maze.ts` (smaller = harder)
- **Maze size**: Expand the `MAZE_LAYOUT` array
- **Player speed**: Adjust `moveSpeed` in `player.ts`

## 🎨 Styling

All UI elements are in `src/style.css`:
- **Colors**: Search for color hex codes (e.g., `#4ECDC4`)
- **Button size**: Adjust `.control-btn` width/height
- **Positioning**: Modify `position`, `top`, `bottom`, etc.

## 🐛 Troubleshooting

### Camera Not Working
- Check HTTPS is enabled (required for WebAR)
- Grant camera permissions when prompted
- Try a different browser (Chrome/Safari recommended)

### Tracking Not Stable
- Ensure good lighting
- Print tracking card larger (20cm+)
- Use matte paper (not glossy)
- Keep card flat and steady

### Buttons Not Responding
- Check console for errors (F12)
- Ensure pointer-events are enabled in CSS
- Try on different device

## 📚 Tech Stack

- **[ZapWorks](https://zap.works/)** - Image tracking SDK
- **[Three.js](https://threejs.org/)** - 3D rendering
- **[Vite](https://vitejs.dev/)** - Build tool & dev server
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety

## 📝 License

MIT © Nathan Hor

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 🔗 Links

- [ZapWorks Documentation](https://docs.zap.works/)
- [Three.js Documentation](https://threejs.org/docs/)
- [Report Issues](https://github.com/NathanHor22/maze-webAR-game/issues)

---

**Built with ❤️ for learning WebAR fundamentals**
