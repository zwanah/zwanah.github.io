# Original research figures

These are the unmodified source PNGs preserved when web previews were introduced.
The public files in `images/` retain their original URLs and aspect ratios, with a maximum dimension of 2400 pixels. No demo application code or hosting settings changed.

`docs/` is already excluded by `_config.yml`, so these full-resolution originals are retained in Git but not duplicated in the Pages deployment. To regenerate a preview, use Pillow `thumbnail((2400, 2400), Image.Resampling.LANCZOS)` and save as PNG with `optimize=True`.

XOver now displays `XOver_framework_final` variants rendered from the camera-ready manuscript’s `figures/XOver_framework_final.pdf` (CropBox, 2400px public PNG/large WebP, 1200px preview). The older `XOver_framework` images are preserved for reference.
