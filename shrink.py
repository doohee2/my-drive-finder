import glob
from PIL import Image

def shrink_icon(path, scale=0.9):
    try:
        img = Image.open(path).convert("RGBA")
        width, height = img.size
        
        new_w = int(width * scale)
        new_h = int(height * scale)
        
        # Resize using Lanczos
        resized_img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Background color from top-left pixel
        bg_color = img.getpixel((0, 0))
        
        # Create new image with same size and background color
        new_img = Image.new("RGBA", (width, height), bg_color)
        
        # Center coordinates
        offset_x = (width - new_w) // 2
        offset_y = (height - new_h) // 2
        
        # Paste resized image
        new_img.paste(resized_img, (offset_x, offset_y))
        
        # Save over original
        new_img.save(path)
        print(f"Shrink successful: {path}")
    except Exception as e:
        print(f"Failed to process {path}: {e}")

icon_files = glob.glob("public/icon-*.png")
for f in icon_files:
    shrink_icon(f, 0.9)
