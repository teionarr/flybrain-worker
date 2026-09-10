// Config for the shared "Wall of Reviews".
//
// To make the wall shareable worldwide, set WALL_ENDPOINT to a hosted JSON
// store that accepts GET (list) and POST (append one entry). Leave it empty to
// run fully offline (reviews keep in this browser's localStorage only).
//
// Example services that need no server of your own:
//   - jsonbin.io, restdb.io, Supabase, Firebase, any KV endpoint
// Point WALL_ENDPOINT at the collection URL and provide a write token below.
window.FLYWORKER_CONFIG = {
  // e.g. "https://example.com/your-collection"  (GET list, POST {entry})
  WALL_ENDPOINT: "",
  // Bearer/API token the endpoint expects, if any
  WALL_TOKEN: "",
};
