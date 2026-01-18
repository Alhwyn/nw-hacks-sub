# Build Resources

## App Icon Required

You need to create an app icon for macOS distribution:

1. Create a 1024x1024 PNG image for your app icon
2. Save it as `icon.png` in this folder
3. Convert it to .icns format:

### Option 1: Using iconutil (macOS)
```bash
# Create iconset folder
mkdir icon.iconset

# Generate required sizes (you can use sips or ImageMagick)
sips -z 16 16 icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32 icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32 icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64 icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128 icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256 icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256 icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512 icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png

# Convert to icns
iconutil -c icns icon.iconset -o icon.icns

# Cleanup
rm -rf icon.iconset
```

### Option 2: Using online tool
Visit https://cloudconvert.com/png-to-icns and upload your icon.png

After creating `icon.icns`, place it in this `build/` folder.
