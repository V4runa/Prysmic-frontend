/**
 * Runs in the document before hydration on /verify-email and /reset-password.
 * Stashes the one-time token and strips it from the address bar so a later
 * click cannot leak it through the Referer header. The React page reads
 * window.__prysmicLinkToken if this already ran.
 */
export const AUTH_LINK_BOOTSTRAP = `(function () {
  try {
    var params = new URLSearchParams(window.location.search);
    if (!params.has("token")) return;
    var token = params.get("token");
    if (token) window.__prysmicLinkToken = token;
    params.delete("token");
    var query = params.toString();
    var next = window.location.pathname + (query ? "?" + query : "") + window.location.hash;
    window.history.replaceState(window.history.state, "", next);
  } catch (err) {}
})();`;
