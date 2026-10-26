/**
 * Ambient declarations for non-code imports.
 *
 * The scaffold ships CSS files (used by the web build) that TypeScript has no
 * built-in way to resolve. Declaring the module shapes here keeps `tsc` clean
 * without weakening `strict` anywhere else.
 */

declare module '*.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
