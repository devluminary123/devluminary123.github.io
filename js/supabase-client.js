/* ============================================================
   Dev Luminary — Supabase client bootstrap
   Loaded after: the Supabase CDN script + supabase-config.js
   Exposes: window.supabaseClient
   ============================================================ */
(function () {
  if (!window.supabase || !window.supabase.createClient) {
    console.error(
      "[Dev Luminary] Supabase library did not load. Check that the " +
      "unpkg CDN <script> tag is present and loaded before supabase-client.js."
    );
    return;
  }

  if (!window.SUPABASE_URL || window.SUPABASE_URL.indexOf("YOUR_SUPABASE") === 0) {
    console.warn(
      "[Dev Luminary] Supabase is not configured yet. " +
      "Open js/supabase-config.js and paste in your project URL + anon key."
    );
  }

  /* Custom storage adapter: this is what makes the "Remember me" checkbox
     on the sign-in form real instead of decorative. When the box is
     checked we keep the Supabase session token in localStorage (survives
     closing the browser). When unchecked, the token lives in
     sessionStorage only (cleared as soon as the tab/browser closes).
     Nothing sensitive (passwords, etc.) is ever written here — Supabase
     itself only ever stores its own short-lived access/refresh tokens. */
  const rememberFlagKey = "dl-remember-me";
  const dlStorage = {
    getItem(key) {
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    },
    setItem(key, value) {
      const remember = window.localStorage.getItem(rememberFlagKey) !== "false";
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
      (remember ? window.localStorage : window.sessionStorage).setItem(key, value);
    },
    removeItem(key) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    },
  };

  window.supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: dlStorage,
      },
    }
  );
})();
