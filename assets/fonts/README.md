# Fonts

The fonts in this directory are **open-licensed stand-ins**, not the typefaces the original Echoes from Afar site uses. The original deployment uses licensed fonts (Segment, HuiWenFangSong, and two bespoke event fonts) that cannot be redistributed in an open-source repository.

To keep `app/globals.css` identical across deployments, the stand-ins are shipped under the same filenames the CSS expects:

| File                          | Stand-in         | Original                  |
| ----------------------------- | ---------------- | ------------------------- |
| `Segment-Regular.ttf`         | Cousine Regular  | Segment                   |
| `汇文仿宋v1.001.ttf`          | Cousine Regular¹ | HuiWenFangSong (汇文仿宋) |
| `ityt-28012025/ityt-280125.*` | Cousine Regular  | ITYT (event font, 400)    |
| `ityt-29012025/ityt-290125.*` | Cousine Bold     | ITYT (event font, 700)    |

¹ The stand-in covers Latin only; CJK text falls back to system fonts via the font stacks defined in `app/globals.css`.

The stand-ins are [Cousine](https://github.com/googlefonts/cousine), licensed under the SIL Open Font License 1.1 (see `OFL.txt`). Only the **filenames** are changed so the CSS resolves; the font data and its internal name are unmodified.

**To use your own fonts:** drop your licensed font files into this directory under the same filenames (or update the `@font-face` rules in `app/globals.css`).
