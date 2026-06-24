// Strip the black background from a circular logo PNG and emit favicon assets.
// Usage: node scripts/make-favicon.mjs [public/favicon-raw.png]
import { spawnSync } from "node:child_process";

const SRC = process.argv[2] ?? "public/favicon-raw.png";

const py = `
import numpy as np
from PIL import Image, ImageDraw

src = ${JSON.stringify(SRC)}
im = Image.open(src).convert("RGBA")
w, h = im.size

# Flood-fill the exterior black starting from a corner. The bright gold rim is a
# closed ring, so the fill stops there and never bleeds into the dark interior.
# We fill into a grayscale copy with a sentinel value, treating near-black as
# fillable via thresh.
flat = Image.new("L", (w, h), 0)
rgb = im.convert("RGB")
gray = rgb.convert("L")
# Mark seed-reachable near-black pixels by flooding the gray image with 255.
work = gray.copy()
ImageDraw.floodfill(work, (0, 0), 255, thresh=20)
filled = np.array(work)
orig = np.array(gray)
# Background = pixels the flood turned to 255 that weren't already 255.
bg = (filled == 255) & (orig != 255)

# Feather the boundary with a 3x3 box blur of the binary foreground mask so the
# cut edge is anti-aliased. Interior stays opaque, exterior stays transparent.
fg = np.where(bg, 0.0, 255.0).astype(np.float32)
pad = np.pad(fg, 1, mode="edge")
box = (
    pad[0:-2, 0:-2] + pad[0:-2, 1:-1] + pad[0:-2, 2:] +
    pad[1:-1, 0:-2] + pad[1:-1, 1:-1] + pad[1:-1, 2:] +
    pad[2:, 0:-2]   + pad[2:, 1:-1]   + pad[2:, 2:]
) / 9.0

arr = np.array(im)
arr[:, :, 3] = box.astype(np.uint8)
out = Image.fromarray(arr, "RGBA")

# Crop to content, then pad to a centered square so the circle stays round
# when rasterized into the square favicon sizes.
out = out.crop(out.getbbox())
side = max(out.size)
square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
square.paste(out, ((side - out.width) // 2, (side - out.height) // 2))
out = square

# Next.js file conventions live in app/ (not public/):
#   app/favicon.ico   -> <link rel="icon">  (legacy / universal)
#   app/icon.png      -> <link rel="icon">  (transparent, modern browsers)
#   app/apple-icon.png-> <link rel="apple-touch-icon">
sizes = [16, 32, 48, 64, 128, 256]
out.save("app/favicon.ico", format="ICO", sizes=[(s, s) for s in sizes])
out.resize((512, 512), Image.LANCZOS).save("app/icon.png")
out.resize((180, 180), Image.LANCZOS).save("app/apple-icon.png")
print("wrote app/favicon.ico + app/icon.png + app/apple-icon.png from", out.size)
`;

const r = spawnSync("python", ["-c", py], { stdio: "inherit" });
process.exit(r.status ?? 0);
