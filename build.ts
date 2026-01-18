await Bun.build({
  entrypoints: ['./electron/main.ts', './electron/preload.ts'],
  outdir: './dist',
  target: 'node',
  external: ['electron'], // This ensures 'electron' is treated as a runtime dependency
});

console.log("Build complete!");