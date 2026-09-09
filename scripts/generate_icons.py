import os
from PIL import Image

def generate_app_icons():
    source_path = 'public/assets/nano_bana_logo.png'
    if not os.path.exists(source_path):
        print(f"Error: Source image {source_path} not found.")
        return

    # Create destination directories
    os.makedirs('build/icons', exist_ok=True)
    os.makedirs('public/assets', exist_ok=True)

    img = Image.open(source_path).convert('RGBA')

    # Standard Linux icon resolutions
    linux_sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
    for size in linux_sizes:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(f'build/icons/{size}x{size}.png', format='PNG')
        if size == 512:
            resized.save('build/icon.png', format='PNG')
            resized.save('public/assets/icon.png', format='PNG')

    # Multi-resolution Windows ICO file
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save('build/icon.ico', format='ICO', sizes=ico_sizes)
    img.save('public/assets/icon.ico', format='ICO', sizes=ico_sizes)

    print("✓ Successfully generated all icon assets for Linux (PNG & icon sets) and Windows (Multi-layer ICO).")

if __name__ == '__main__':
    generate_app_icons()
