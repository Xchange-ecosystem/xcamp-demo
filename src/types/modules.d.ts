// Ambient declarations for non-code imports that TypeScript can't resolve on
// its own but Vite handles at build time.

// CSS side-effect import exposed via the @xchange/ui "./styles" export map entry.
declare module "@xchange/ui/styles";
