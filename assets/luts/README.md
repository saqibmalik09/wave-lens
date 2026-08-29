# LUT looks

The five built-in looks (bw, sepia, vintage, film_warm, film_cool) are generated
procedurally inside the engine at startup — zero asset bytes shipped in the APK.

Custom looks for the CDN pipeline are standard `.cube` files (any grid size 2–256);
the SDK loads them via `WaveLensView.loadCubeLut(...)` and resamples to its internal
64-point grid. Use `../tools/generate_luts.py` to export the built-in looks as
`.cube` files (useful as starting points for designers).
