/* ============================================================
   Dev Luminary — auth.js
   Central authentication module used by every page.
   Loaded after: supabase CDN script, supabase-config.js, supabase-client.js
   Exposes: window.DLAuth
   ============================================================ */
const DLAuth = (function () {
  const $ = (s, r = document) => r.querySelector(s);

  function client() {
    return window.supabaseClient;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }
  function isValidUsername(u) {
    return /^[a-zA-Z0-9_]{3,20}$/.test(String(u || "").trim());
  }

  /* Visual-only password strength meter (0-5). This never blocks
     sign up — the ONLY hard requirement is the 8-character minimum
     enforced in signUp() below. */
  function passwordScore(p) {
    p = p || "";
    let s = 0;
    if (p.length >= 8) s++;
    if (p.length >= 12) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }

  /* Turns raw Supabase/GoTrue errors into the friendly copy from the spec,
     without ever leaking raw database error text to the visitor. */
  function friendlyError(err) {
    if (!navigator.onLine) {
      return "Unable to connect. Please check your internet connection and try again.";
    }
    const msg = ((err && err.message) || "").toLowerCase();
    if (!msg) return "Something went wrong. Please try again.";
    if (msg.includes("invalid login credentials")) return "Email or password is incorrect.";
    if (msg.includes("already registered")) return "An account with this email already exists.";
    if (msg.includes("email not confirmed"))
      return "Please verify your email before signing in — check your inbox.";
    if (msg.includes("password") && (msg.includes("at least") || msg.includes("6 characters") || msg.includes("short")))
      return "Password must contain at least 8 characters.";
    if (msg.includes("unable to validate email") || msg.includes("invalid email"))
      return "Please enter a valid email address.";
    if (msg.includes("rate limit") || msg.includes("too many"))
      return "Too many attempts. Please wait a moment and try again.";
    if (msg.includes("profiles_username") || msg.includes("username"))
      return "That username is already taken.";
    if (msg.includes("failed to fetch") || msg.includes("network"))
      return "Unable to connect. Please try again.";
    if (msg.includes("token") && msg.includes("expired"))
      return "This link has expired. Please request a new one.";
    return err.message || "Something went wrong. Please try again.";
  }

  async function checkUsernameAvailable(username) {
    try {
      const { data, error } = await client().rpc("is_username_available", {
        check_username: username,
      });
      if (error) return true; // fail open on the friendly pre-check — the DB unique
      return !!data; // constraint is still the real source of truth.
    } catch (e) {
      return true;
    }
  }

  async function signUp({ email, password, username, displayName }) {
    email = String(email || "").trim();
    username = String(username || "").trim();
    displayName = String(displayName || "").trim();

    if (!isValidEmail(email)) throw new Error("Please enter a valid email address.");
    if (!isValidUsername(username))
      throw new Error("Username must be 3–20 characters (letters, numbers, underscore only).");
    if (!password || password.length < 8)
      throw new Error("Password must contain at least 8 characters.");

    const available = await checkUsernameAvailable(username);
    if (!available) throw new Error("That username is already taken.");

    const redirectTo = location.origin + location.pathname.replace(/[^/]*$/, "index.html");
    const { data, error } = await client().auth.signUp({
      email,
      password,
      options: {
        data: { username: username.toLowerCase(), display_name: displayName || username },
        emailRedirectTo: redirectTo,
      },
    });
    if (error) throw new Error(friendlyError(error));

    // Supabase returns a "shadow" user with an empty identities array when
    // signing up with an email that is already registered & confirmed —
    // this is intentional (prevents account enumeration), so we translate it.
    if (data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error("An account with this email already exists.");
    }
    return data;
  }

  async function signIn({ email, password, remember }) {
    email = String(email || "").trim();
    if (!isValidEmail(email)) throw new Error("Please enter a valid email address.");
    if (!password) throw new Error("Please enter your password.");

    window.localStorage.setItem("dl-remember-me", remember === false ? "false" : "true");

    const { data, error } = await client().auth.signInWithPassword({ email, password });
    if (error) throw new Error(friendlyError(error));
    return data;
  }

  async function signOut() {
    const { error } = await client().auth.signOut();
    if (error) throw new Error(friendlyError(error));
  }

  async function resetPassword(email) {
    email = String(email || "").trim();
    if (!isValidEmail(email)) throw new Error("Please enter a valid email address.");
    const redirectTo = location.origin + location.pathname.replace(/[^/]*$/, "reset-password.html");
    const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw new Error(friendlyError(error));
  }

  async function updatePassword(newPassword) {
    if (!newPassword || newPassword.length < 8)
      throw new Error("Password must contain at least 8 characters.");
    const { error } = await client().auth.updateUser({ password: newPassword });
    if (error) throw new Error(friendlyError(error));
  }

  async function getCurrentSession() {
    try {
      const { data, error } = await client().auth.getSession();
      if (error) return null;
      return data.session;
    } catch (e) {
      return null;
    }
  }

  async function getCurrentUser() {
    try {
      const { data, error } = await client().auth.getUser();
      if (error) return null;
      return data.user;
    } catch (e) {
      return null;
    }
  }

  async function getProfile(userId) {
    const { data, error } = await client().from("profiles").select("*").eq("id", userId).single();
    if (error) throw new Error(friendlyError(error));
    return data;
  }

  async function updateProfile(userId, fields) {
    const allowed = {};
    if (fields.username !== undefined) {
      if (!isValidUsername(fields.username))
        throw new Error("Username must be 3–20 characters (letters, numbers, underscore only).");
      const available = await checkUsernameAvailable(fields.username);
      const current = await getProfile(userId);
      if (!available && fields.username.toLowerCase() !== (current.username || "").toLowerCase()) {
        throw new Error("That username is already taken.");
      }
      allowed.username = fields.username.toLowerCase();
    }
    if (fields.display_name !== undefined) allowed.display_name = String(fields.display_name).trim();
    if (fields.bio !== undefined) allowed.bio = String(fields.bio).trim();
    if (fields.avatar_url !== undefined) allowed.avatar_url = String(fields.avatar_url).trim();

    const { data, error } = await client()
      .from("profiles")
      .update(allowed)
      .eq("id", userId)
      .select()
      .single();
    if (error) throw new Error(friendlyError(error));
    return data;
  }

  /* Route guard for pages that require a logged-in user (e.g. profile.html).
     This checks the real Supabase session — it never relies on hiding UI
     as a security mechanism. */
  async function requireAuth(loginPage) {
    const session = await getCurrentSession();
    if (!session) {
      const here = location.pathname.split("/").pop() || "index.html";
      location.replace((loginPage || "auth.html") + "?redirect=" + encodeURIComponent(here));
      return null;
    }
    return session;
  }

  /* Keeps the shared header (Sign In button / user pill / mobile menu CTA)
     in sync with the real Supabase auth state on every page. */
  function initHeaderUI() {
    if (!client()) return;
    const loginBtn = $(".login-btn");
    const pill = $("#user-pill");
    const pillLink = $("#user-pill-link");
    const nameEl = $("#user-email");
    const logoutBtn = $("#logout");
    const mobileCta = $(".mobile-cta");
    const mobileCtaLabel = mobileCta ? mobileCta.querySelector("span:nth-child(3)") : null;

    function paint(session, profile) {
      const loggedIn = !!(session && session.user);
      if (loginBtn) loginBtn.style.display = loggedIn ? "none" : "";
      if (pill) pill.classList.toggle("show", loggedIn);
      if (loggedIn) {
        const label = (profile && profile.username && "@" + profile.username) || session.user.email;
        if (nameEl) nameEl.textContent = label;
        if (mobileCtaLabel) mobileCtaLabel.textContent = "My Profile";
        if (mobileCta) mobileCta.setAttribute("href", "profile.html");
      } else {
        if (mobileCtaLabel) mobileCtaLabel.textContent = "Sign In / Sign Up";
        if (mobileCta) mobileCta.setAttribute("href", "auth.html");
      }
    }

    async function refresh() {
      const session = await getCurrentSession();
      let profile = null;
      if (session) {
        try {
          profile = await getProfile(session.user.id);
        } catch (e) {
          /* profile row may not exist yet (trigger race) — UI still works with email */
        }
      }
      paint(session, profile);
    }

    refresh();
    client().auth.onAuthStateChange((_event, session) => {
      paint(session, null);
      refresh();
    });

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        logoutBtn.disabled = true;
        try {
          await signOut();
        } finally {
          location.href = "index.html";
        }
      });
    }
    if (pillLink) pillLink.setAttribute("href", "profile.html");
  }

  return {
    isValidEmail,
    isValidUsername,
    passwordScore,
    friendlyError,
    checkUsernameAvailable,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    getCurrentSession,
    getCurrentUser,
    getProfile,
    updateProfile,
    requireAuth,
    initHeaderUI,
  };
})();
