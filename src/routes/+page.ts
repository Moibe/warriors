// The battle screen is a WebGL canvas whose sprites and UI textures are all
// painted to a 2D canvas at runtime — there is nothing meaningful to render on
// the server, and `document` has to exist for any of it to work.
export const ssr = false;
export const prerender = false;
