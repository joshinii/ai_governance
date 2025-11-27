ICON PLACEHOLDER FILES

For POC, you can use any 16x16, 48x48, and 128x128 PNG icons.

Quick way to create icons:
1. Use any icon generator online (e.g., favicon.io)
2. Create shield/security themed icons
3. Name them: icon16.png, icon48.png, icon128.png
4. Place in this icons/ folder

Or use these placeholder commands:

# Linux/Mac with ImageMagick:
convert -size 16x16 xc:blue icon16.png
convert -size 48x48 xc:blue icon48.png
convert -size 128x128 xc:blue icon128.png

# Or just copy any existing PNG and rename it
# The extension will work without proper icons (just shows default)

Recommended colors:
- Primary: #2563eb (blue - matches dashboard)
- Background: white or transparent
- Style: Shield, lock, or security badge
