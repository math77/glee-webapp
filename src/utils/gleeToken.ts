// Flip this to true once $GLEE actually launches — every warning that reads this
// constant (via <GleeTokenNotice />) disappears automatically, everywhere it's used.

// Flip this to true once $GLEE actually launches — every warning that reads this
// constant (via <GleeTokenNotice />) disappears automatically, everywhere it's used.
export const GLEE_TOKEN_LAUNCHED = false;

export const GLEE_NOT_LAUNCHED_MESSAGE =
  "$GLEE has not launched yet. Any token using this name elsewhere is not official — treat it as a scam.";

// TODO: fill in once the launchpad is chosen. LAUNCHPAD_URL stays "#" until then — anything
// reading it (the About page's acquisition row, the header's "Get $GLEE" button) renders
// disabled while it is.
export const LAUNCHPAD_NAME = "";
export const LAUNCHPAD_URL = "#";