/* ============================================================
SCRIPTORIUM NEXUS V13 — GATEWAY AUTH
Handles:
- Login / Register tabs
- Studio ID format enforcement (role-specific domains)
- Director / Writer / Actor role clearance
  (Writer is the only active workspace role — Director and Actor
   are reserved clearances, locked pending future activation)
- Frontend-level identity protection
  (reserved-name registry + unverified disclosure + self-certification)
- Session persistence
- Redirect to Studio Lot
============================================================ */
(() => {
    "use strict";

    const USERS_KEY = "scriptorium_users_v13";
    const SESSION_KEY = "scriptorium_session_v13";

    /* Every role gets its own Studio ID domain. Only "writer" is an
       active, registerable clearance right now — director and actor
       domains are reserved for when those portals go live. */
    const ROLE_DOMAINS = {
        director: "@s.director.com",
        writer: "@s.writer.com",
        actor: "@s.actor.com"
    };

    const ACTIVE_ROLE = "writer";

    const EMAIL_REGEX = /^[a-z]+_[a-z]+\.[a-z]@s\.(director|writer|actor)\.com$/;

    /* ============================================================
       FRONTEND IDENTITY PROTECTION
       ------------------------------------------------------------
       This is a client-side prototype safeguard only. Because the
       front end is open-source and runs entirely in the browser,
       none of this can be made fully tamper-proof here — a
       determined user can edit local script or localStorage
       directly. Real protection (the Invite Code + Reserved
       Registry + Admin Verification + Security PIN system) needs a
       backend, per the project's own security roadmap. What this
       layer *does* provide, honestly:
         1. Blocks the exact reserved name combinations below.
         2. Marks every new account UNVERIFIED so the studio (and
            anyone viewing a project) can see clearance has not been
            confirmed by a human.
         3. Requires a self-certification checkbox at registration.
       Extend RESERVED_IDENTITIES as the studio grows.
    ============================================================ */
    const RESERVED_IDENTITIES = [
        { first: "christopher", second: "nolan" }
        // Add more { first, second } pairs here as needed.
        // A true solution moves this list server-side with admin control.
    ];

    function isReservedIdentity(firstName, secondName) {
        const first = sanitizeNamePart(firstName);
        const second = sanitizeNamePart(secondName);

        return RESERVED_IDENTITIES.some(
            (entry) => entry.first === first && entry.second === second
        );
    }

    function $(id) {
        return document.getElementById(id);
    }

    const tabLogin = $("tabLogin");
    const tabRegister = $("tabRegister");

    const loginForm = $("loginForm");
    const registerForm = $("registerForm");

    const authStatus = $("authStatus");

    const loginEmail = $("loginEmail");
    const loginPassword = $("loginPassword");

    const regFirstName = $("regFirstName");
    const regSecondName = $("regSecondName");
    const regInitial = $("regInitial");
    const regEmailPreview = $("regEmailPreview");
    const regPassword = $("regPassword");
    const regConfirmPassword = $("regConfirmPassword");
    const regCertify = $("regCertify");

    const roleDirector = $("roleDirector");
    const roleWriter = $("roleWriter");
    const roleActor = $("roleActor");

    const roleDirectorCard = $("roleDirectorCard");
    const roleWriterCard = $("roleWriterCard");
    const roleActorCard = $("roleActorCard");

    const state = {
        activeTab: "login"
    };

    /* ============================================================
       UTILITIES
    ============================================================ */
    function sanitizeNamePart(value) {
        return String(value || "")
            .toLowerCase()
            .trim()
            .replace(/[^a-z]/g, "");
    }

    function buildStudioEmail(firstName, secondName, initial, role) {
        const first = sanitizeNamePart(firstName);
        const second = sanitizeNamePart(secondName);
        const init = sanitizeNamePart(initial).slice(0, 1);
        const domain = ROLE_DOMAINS[role] || ROLE_DOMAINS[ACTIVE_ROLE];

        if (!first || !second || !init) {
            return "";
        }

        return `${first}_${second}.${init}${domain}`;
    }

    function normalizeLoginEmail(value) {
        let email = String(value || "").trim().toLowerCase();

        if (!email) {
            return "";
        }

        if (!email.includes("@")) {
            email += ROLE_DOMAINS[ACTIVE_ROLE];
        }

        return email;
    }

    function simpleHash(value) {
        const str = String(value);
        let hash = 5381;

        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
        }

        return "sx_" + hash.toString(36) + "_" + str.length.toString(36);
    }

    function generateToken() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }

    function getCurrentTime() {
        return new Date().toISOString();
    }

    /* ============================================================
       STORAGE
    ============================================================ */
    function getUsers() {
        try {
            const raw = localStorage.getItem(USERS_KEY);
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function saveUsers(users) {
        try {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
        } catch {}
    }

    function setSession(user) {
        const session = {
            email: user.email,
            role: user.role || ACTIVE_ROLE,
            verification: user.verification || "UNVERIFIED",
            loginTime: getCurrentTime(),
            token: generateToken()
        };

        try {
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        } catch {}
    }

    function getSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            const parsed = JSON.parse(raw);

            if (!parsed || !parsed.email) {
                return null;
            }

            return parsed;
        } catch {
            return null;
        }
    }

    function clearSession() {
        try {
            localStorage.removeItem(SESSION_KEY);
        } catch {}
    }

    /* ============================================================
       UI HELPERS
    ============================================================ */
    function showStatus(message, type) {
        if (!authStatus) return;

        authStatus.textContent = message || "";
        authStatus.className = "auth-status";

        if (message) {
            authStatus.classList.add("show");
        }

        if (type === "error" || type === "success") {
            authStatus.classList.add(type);
        }
    }

    function clearStatus() {
        showStatus("", "");
    }

    function switchTab(tab) {
        state.activeTab = tab;

        if (tabLogin) {
            tabLogin.classList.toggle("active", tab === "login");
        }

        if (tabRegister) {
            tabRegister.classList.toggle("active", tab === "register");
        }

        if (loginForm) {
            loginForm.classList.toggle("active", tab === "login");
        }

        if (registerForm) {
            registerForm.classList.toggle("active", tab === "register");
        }

        clearStatus();
    }

    function redirectDashboard() {
        window.location.href = "dashboard.html";
    }

    function updateEmailPreview() {
        if (!regEmailPreview) return;

        const email = buildStudioEmail(
            regFirstName ? regFirstName.value : "",
            regSecondName ? regSecondName.value : "",
            regInitial ? regInitial.value : "",
            ACTIVE_ROLE
        );

        regEmailPreview.value = email || `name_secondname.initial${ROLE_DOMAINS[ACTIVE_ROLE]}`;
    }

    function updateRoleCards() {
        if (roleDirectorCard) {
            roleDirectorCard.classList.remove("active");
        }

        if (roleWriterCard) {
            roleWriterCard.classList.toggle(
                "active",
                Boolean(roleWriter && roleWriter.checked)
            );
        }

        if (roleActorCard) {
            roleActorCard.classList.remove("active");
        }
    }

    /* ============================================================
       REGISTER
    ============================================================ */
    function handleRegister(event) {
        event.preventDefault();

        const firstName = regFirstName ? regFirstName.value.trim() : "";
        const secondName = regSecondName ? regSecondName.value.trim() : "";
        const initial = regInitial ? regInitial.value.trim() : "";

        const password = regPassword ? regPassword.value : "";
        const confirmPassword = regConfirmPassword ? regConfirmPassword.value : "";

        if (!firstName || !secondName || !initial) {
            showStatus("Enter first name, second name, and initial to generate Studio ID.", "error");
            return;
        }

        if (isReservedIdentity(firstName, secondName)) {
            showStatus(
                "This identity is reserved pending verification. If this is genuinely you, contact Studio Administration — Scriptorium blocks unverified registrations under protected names to prevent impersonation.",
                "error"
            );
            return;
        }

        const email = buildStudioEmail(firstName, secondName, initial, ACTIVE_ROLE);

        if (!EMAIL_REGEX.test(email)) {
            showStatus("Studio ID protocol violation. Format must be name_secondname.initial@s.writer.com", "error");
            return;
        }

        if (password.length < 6) {
            showStatus("Password must contain at least 6 characters.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showStatus("Passwords do not match.", "error");
            return;
        }

        if (!regCertify || !regCertify.checked) {
            showStatus("Please confirm the identity certification before creating a Studio ID.", "error");
            return;
        }

        const users = getUsers();
        const existingUser = users.find((user) => user.email === email);

        if (existingUser) {
            showStatus("This Studio ID already exists. Use Already a User to access it.", "error");
            return;
        }

        const user = {
            email,
            passHash: simpleHash(password),
            role: ACTIVE_ROLE,
            verification: "UNVERIFIED",
            createdAt: getCurrentTime()
        };

        users.push(user);
        saveUsers(users);
        setSession(user);

        showStatus("Studio ID created. Entering Studio Lot...", "success");

        setTimeout(() => {
            redirectDashboard();
        }, 650);
    }

    /* ============================================================
       LOGIN
    ============================================================ */
    function handleLogin(event) {
        event.preventDefault();

        const email = normalizeLoginEmail(loginEmail ? loginEmail.value : "");
        const password = loginPassword ? loginPassword.value : "";

        if (!EMAIL_REGEX.test(email)) {
            showStatus("Invalid Studio ID. Required format: name_secondname.initial@s.writer.com", "error");
            return;
        }

        if (!password) {
            showStatus("Enter your access key.", "error");
            return;
        }

        const users = getUsers();
        const user = users.find((entry) => entry.email === email);

        if (!user || user.passHash !== simpleHash(password)) {
            showStatus("Invalid Studio ID or password.", "error");
            return;
        }

        if (user.role !== ACTIVE_ROLE) {
            showStatus(
                "Director and Actor clearance are reserved for a future release. Writer clearance is active now.",
                "error"
            );
            return;
        }

        setSession(user);

        showStatus("Clearance confirmed. Entering Studio Lot...", "success");

        setTimeout(() => {
            redirectDashboard();
        }, 650);
    }

    /* ============================================================
       BIND EVENTS
    ============================================================ */
    function bindTabs() {
        if (tabLogin) {
            tabLogin.addEventListener("click", () => {
                switchTab("login");
            });
        }

        if (tabRegister) {
            tabRegister.addEventListener("click", () => {
                switchTab("register");
            });
        }
    }

    function bindForms() {
        if (loginForm) {
            loginForm.addEventListener("submit", handleLogin);
        }

        if (registerForm) {
            registerForm.addEventListener("submit", handleRegister);
        }
    }

    function bindRegistrationPreview() {
        if (regFirstName) {
            regFirstName.addEventListener("input", updateEmailPreview);
        }

        if (regSecondName) {
            regSecondName.addEventListener("input", updateEmailPreview);
        }

        if (regInitial) {
            regInitial.addEventListener("input", () => {
                if (regInitial.value.length > 1) {
                    regInitial.value = regInitial.value.slice(0, 1);
                }

                updateEmailPreview();
            });
        }
    }

    function bindRoles() {
        if (roleWriterCard) {
            roleWriterCard.addEventListener("click", () => {
                if (roleWriter) {
                    roleWriter.checked = true;
                }

                updateRoleCards();
                updateEmailPreview();
            });
        }

        if (roleDirectorCard) {
            roleDirectorCard.addEventListener("click", (event) => {
                event.preventDefault();

                if (roleDirector) {
                    roleDirector.checked = false;
                }

                updateRoleCards();
                showStatus("Director clearance is reserved for a future release. Select Writer.", "error");
            });
        }

        if (roleActorCard) {
            roleActorCard.addEventListener("click", (event) => {
                event.preventDefault();

                if (roleActor) {
                    roleActor.checked = false;
                }

                updateRoleCards();
                showStatus("Actor clearance is reserved for a future release. Select Writer.", "error");
            });
        }
    }

    /* ============================================================
       INITIALIZE
    ============================================================ */
    function initialize() {
        const params = new URLSearchParams(window.location.search);

        if (params.get("logout") === "1") {
            clearSession();
            showStatus("Session closed. Studio Lot access terminated.", "success");
        } else {
            const session = getSession();

            if (session && session.email) {
                redirectDashboard();
                return;
            }
        }

        bindTabs();
        bindForms();
        bindRegistrationPreview();
        bindRoles();

        updateEmailPreview();
        updateRoleCards();
        switchTab("login");
    }

    initialize();
})();
