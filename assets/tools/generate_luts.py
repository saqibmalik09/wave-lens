#!/usr/bin/env python3
"""Export the Wave Lens built-in looks as .cube files.

Mirrors the transforms in engine/src/lut.cpp so designers can start from the
shipped looks and iterate in Resolve/Photoshop, then deliver .cube files back
for the CDN pipeline.

Usage: python generate_luts.py [output_dir]
"""

import os
import sys

SIZE = 33  # standard .cube grid


def clamp01(v):
    return 0.0 if v < 0 else (1.0 if v > 1 else v)


def lerp(a, b, t):
    return a + (b - a) * t


def scurve(x, amount):
    s = x * x * (3 - 2 * x)
    return lerp(x, s, amount)


def t_bw(r, g, b):
    l = 0.299 * r + 0.587 * g + 0.114 * b
    l = scurve(l, 0.35)
    return l, l, l


def t_sepia(r, g, b):
    return (
        clamp01(0.393 * r + 0.769 * g + 0.189 * b),
        clamp01(0.349 * r + 0.686 * g + 0.168 * b),
        clamp01(0.272 * r + 0.534 * g + 0.131 * b),
    )


def t_vintage(r, g, b):
    l = 0.299 * r + 0.587 * g + 0.114 * b
    r = lerp(r, l, 0.25) * 0.86 + 0.075
    g = lerp(g, l, 0.25) * 0.86 + 0.065
    b = lerp(b, l, 0.25) * 0.86 + 0.05
    r = scurve(r, 0.15) + 0.035
    g = scurve(g, 0.15)
    b = scurve(b, 0.15) - 0.045
    return clamp01(r), clamp01(g), clamp01(b)


def t_film_warm(r, g, b):
    l = 0.299 * r + 0.587 * g + 0.114 * b
    return (
        clamp01(lerp(l, scurve(r, 0.3), 1.10) + 0.03),
        clamp01(lerp(l, scurve(g, 0.3), 1.08)),
        clamp01(lerp(l, scurve(b, 0.3), 1.05) - 0.03),
    )


def t_film_cool(r, g, b):
    l = 0.299 * r + 0.587 * g + 0.114 * b
    return (
        clamp01(lerp(l, scurve(r, 0.3), 1.02) - 0.02),
        clamp01(lerp(l, scurve(g, 0.3), 1.02) + 0.005),
        clamp01(lerp(l, scurve(b, 0.3), 1.05) + 0.04),
    )


LOOKS = {
    "bw": t_bw,
    "sepia": t_sepia,
    "vintage": t_vintage,
    "film_warm": t_film_warm,
    "film_cool": t_film_cool,
}


def write_cube(path, name, fn):
    inv = 1.0 / (SIZE - 1)
    with open(path, "w") as f:
        f.write(f'TITLE "WaveLens {name}"\n')
        f.write(f"LUT_3D_SIZE {SIZE}\n")
        f.write("DOMAIN_MIN 0.0 0.0 0.0\nDOMAIN_MAX 1.0 1.0 1.0\n")
        for bi in range(SIZE):
            for gi in range(SIZE):
                for ri in range(SIZE):
                    r, g, b = fn(ri * inv, gi * inv, bi * inv)
                    f.write(f"{r:.6f} {g:.6f} {b:.6f}\n")


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "luts")
    os.makedirs(out_dir, exist_ok=True)
    for name, fn in LOOKS.items():
        path = os.path.join(out_dir, f"{name}.cube")
        write_cube(path, name, fn)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
