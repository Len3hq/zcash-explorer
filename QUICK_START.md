# Quick Start Guide

## Running the Application

```bash
# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

Visit: **http://localhost:3000**

## Using Dark Mode

### Finding the Toggle

The dark mode toggle is located in the **top-right corner** of the navigation header, next to the search bar.

### Toggle Design

**Light Mode (Default)**
```
┌─────────────┐
│  ☀️  ●────  │  ← Sun icon on the left (gold background)
└─────────────┘
```

**Dark Mode**
```
┌─────────────┐
│  ────●  🌙  │  ← Moon icon on the right (blue background)
└─────────────┘
```

### How to Switch

1. Click the toggle button
2. The theme changes instantly with smooth animations
3. Your preference is saved automatically

### What Changes in Dark Mode?

- **Background**: Changes from cream to deep blue-black
- **Cards**: White cards become dark navy with subtle borders
- **Text**: Dark text becomes light for comfortable reading
- **Search bar**: Adapts to dark theme
- **Tables**: Enhanced hover effects with better contrast
- **Code blocks**: Syntax highlighting optimized for dark theme
- **Modals**: Improved backdrop and shadow effects

## Features Available on All Pages

The dark mode works consistently across:

- ✅ **Home/Overview** - Network stats and latest blocks
- ✅ **Blocks List** - Recent blocks table
- ✅ **Block Detail** - Individual block information
- ✅ **Transactions List** - Recent transactions
- ✅ **Transaction Detail** - Full transaction data
- ✅ **Search Results** - All search functionality
- ✅ **Modals** - Raw JSON viewer

## Keyboard Shortcuts

While there are no specific keyboard shortcuts for the toggle, you can:

- **Tab** to navigate to the toggle button
- **Enter** or **Space** to activate it

## System Theme Detection

If you haven't selected a theme yet, the application will:

1. Check your operating system's theme preference
2. Automatically use dark mode if your OS is in dark mode
3. Fall back to light mode otherwise

## Theme Persistence

Your theme choice is saved to your browser's localStorage:

- Persists across browser sessions
- Survives page refreshes
- Independent per browser/device

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge 76+
- Firefox 67+
- Safari 12.1+
- Opera 63+

## Tips for Best Experience

1. **First Time Users**: Try both themes to see which you prefer
2. **Reading Code**: Dark mode often reduces eye strain for code blocks
3. **Low Light**: Dark mode is perfect for nighttime browsing
4. **Bright Environments**: Light mode works better in well-lit spaces
5. **Mobile**: Both themes are optimized for mobile devices

## Troubleshooting

### Theme doesn't persist?
- Check if your browser allows localStorage
- Try clearing cache and cookies
- Disable private/incognito mode

### Toggle not responding?
- Check if JavaScript is enabled
- Try refreshing the page
- Check browser console for errors

### Colors look wrong?
- Ensure you're using a modern browser
- Try disabling browser extensions
- Clear browser cache

## Need Help?

For more detailed information about the dark mode implementation, see:
- **[DARK_MODE.md](./DARK_MODE.md)** - Technical documentation
- **[README.md](./README.md)** - General project information

---

**Enjoy exploring the Zcash blockchain in style! 🌓✨**
