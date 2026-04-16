#!/bin/bash

# 🚀 AR Maze Game - Deployment Script
# 
# This script helps you deploy to various platforms

echo "🎮 AR Maze Game - Deployment Helper"
echo ""

# Check if built
if [ ! -d "dist" ]; then
    echo "📦 Building project..."
    npm run build
    echo "✅ Build complete!"
    echo ""
fi

echo "Choose deployment target:"
echo ""
echo "1) Netlify (Recommended)"
echo "2) Vercel"
echo "3) GitHub Pages"
echo "4) Just show me the dist folder"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "📡 Deploying to Netlify..."
        echo ""
        if ! command -v netlify &> /dev/null; then
            echo "Installing Netlify CLI..."
            npm install -g netlify-cli
        fi
        netlify deploy --prod
        ;;
    2)
        echo ""
        echo "📡 Deploying to Vercel..."
        echo ""
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi
        vercel --prod
        ;;
    3)
        echo ""
        echo "📡 Deploying to GitHub Pages..."
        echo ""
        git subtree push --prefix dist origin gh-pages
        echo ""
        echo "✅ Deployed! Visit: https://NathanHor22.github.io/maze-webAR-game"
        ;;
    4)
        echo ""
        echo "📁 Dist folder ready at: $(pwd)/dist"
        echo ""
        echo "Upload these files to any static host:"
        ls -lh dist/
        ;;
    *)
        echo "Invalid choice!"
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Don't forget to:"
echo "  - Test the deployed URL on your phone"
echo "  - Print the tracking card from assets/targets/tracking-target.png"
echo "  - Share the link with your team!"
