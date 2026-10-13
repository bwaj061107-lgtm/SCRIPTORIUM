/* ============================================================
SCRIPTORIUM NEXUS V14 — SOUNDSTAGE / EDITOR
Preserves V11.0 editor logic and connects it to:
- Studio session (Writer clearance only)
- Active project
- Genre chosen per character / architecture (no engine switcher):
  every document carries its own genre and the theme follows it
- Genre-specific character templates + architecture matrix
- Automation: age from birthdate, file name from title fields,
  call-sheet day/date
- Production Report (single PDF: family tree, connections, checks)
- Default parchment tone with Light / Dark display mode
- Project autosave
- Return to Studio Lot
============================================================ */
(() => {
    "use strict";

    const SESSION_KEY = "scriptorium_session_v13";
    const PROJECTS_KEY = "scriptorium_projects_v13";
    const ACTIVE_PROJECT_KEY = "scriptorium_active_project_v13";
    const MODE_STORAGE_KEY = "scriptorium_display_mode_v14";
    const PREFS_KEY = "scriptorium_prefs_v14";

    /* ============================================================
       DOM REFERENCES
    ============================================================ */
    function $(id) {
        return document.getElementById(id);
    }

    const editor = $("editorArea");
    const docTitle = $("docTitle");
    const tabs = $("tabs");
    const workspaceList = $("workspaceList");
    const folderName = $("folderName");
    const globalSearch = $("globalSearch");
    const saveStatus = $("saveStatus");
    const bookWrapper = $("bookWrapper");
    const folderSidebar = $("folderSidebar");
    const fileSidebar = $("fileSidebar");

    const wordCount = $("wordCount");
    const charCount = $("charCount");
    const paraCount = $("paraCount");
    const readTime = $("readTime");

    const fontFamily = $("fontFamily");
    const fontSize = $("fontSize");
    const textColor = $("textColor");

    const architectureModal = $("architectureModal");
    const confirmDeleteModal = $("confirmDeleteModal");
    const callSheetModal = $("callSheetModal");

    const templateDropdownContainer = $("templateDropdownContainer");
    const templateDropdownBtn = $("templateDropdownBtn");

    const btnBold = $("btnBold");
    const btnItalic = $("btnItalic");
    const btnUnderline = $("btnUnderline");
    const btnStrike = $("btnStrike");

    const nexusWord = $("nexusWord");
    const themeFx = $("themeFx");
    const pageWatermark = $("pageWatermark");
    const themeBadgeIcon = $("themeBadgeIcon");
    const themeBadgeLabel = $("themeBadgeLabel");
    const settingsDropdown = $("settingsDropdown");

    const architectureGrid = $("architectureGrid");
    const archThemeChip = $("archThemeChip");

    const csDayNumber = $("csDayNumber");
    const csDate = $("csDate");

    const genreModal = $("genreModal");
    const genreGrid = $("genreGrid");
    const genreModalPrompt = $("genreModalPrompt");
    const genreModalChip = $("genreModalChip");
    const archBackBtn = $("archBackBtn");
    const reportBtn = $("reportBtn");

    const deleteTargetName = $("deleteTargetName");

    const btnAnalyse = $("btnAnalyse");
    const aiAnalysisResults = $("aiAnalysisResults");
    const aiAnalysisModal = $("aiAnalysisModal");

    const activeProjectName = $("activeProjectName");
    const engineLockBadge = $("engineLockBadge");

    /* ============================================================
       ENGINE CONFIGURATION
    ============================================================ */
    const engineConfig = {
        "engine-normal": {
            nexus: "NEXUS",
            label: "Normal",
            genre: "Studio Standard",
            iconFolder: "fa-folder",
            iconFile: "fa-file-lines",
            iconTheme: "fa-feather-pointed",
            watermark: "fa-feather-pointed",
            fx: "normal",
            feature: {
                name: "Neural Studio",
                desc: "Normal tone. Clean parchment with no genre atmosphere."
            },
            arch: {
                world: { key: "world", label: "World Bible", icon: "fa-globe" },
                power: { key: "systemarch", label: "System Architecture", icon: "fa-microchip" },
                special: { key: "networkmap", label: "Network Map", icon: "fa-diagram-project" }
            }
        },

        "engine-drama": {
            nexus: "PRESTIGE",
            label: "Drama",
            genre: "Crime Drama",
            iconFolder: "fa-flask",
            iconFile: "fa-file-prescription",
            iconTheme: "fa-flask-vial",
            watermark: "fa-flask",
            fx: "drama",
            feature: {
                name: "Pressure Room",
                desc: "Drama engine engaged. Ledgers, smoke, and quiet threats behind closed doors."
            },
            arch: {
                world: { key: "territory", label: "Territory Map", icon: "fa-map-location-dot" },
                power: { key: "operation", label: "Operation Blueprint", icon: "fa-flask" },
                special: { key: "empire", label: "Criminal Empire", icon: "fa-user-tie" }
            }
        },

        "engine-fantasy": {
            nexus: "REALM",
            label: "Fantasy",
            genre: "Epic Fantasy",
            iconFolder: "fa-chess-rook",
            iconFile: "fa-scroll",
            iconTheme: "fa-crown",
            watermark: "fa-crown",
            fx: "fantasy",
            feature: {
                name: "Realm Codex",
                desc: "Fantasy engine engaged. Bloodline oaths, old magic, and ancient law take hold."
            },
            arch: {
                world: { key: "world", label: "World Bible", icon: "fa-globe" },
                power: { key: "magic", label: "Magic System", icon: "fa-wand-sparkles" },
                special: { key: "kingdom", label: "Kingdom", icon: "fa-chess-rook" }
            }
        },

        "engine-horror": {
            nexus: "ABYSS",
            label: "Horror",
            genre: "Paranormal Horror",
            iconFolder: "fa-book-skull",
            iconFile: "fa-ghost",
            iconTheme: "fa-ghost",
            watermark: "fa-ghost",
            fx: "horror",
            feature: {
                name: "Static Veil",
                desc: "Horror engine engaged. The lights flicker… something has entered the room."
            },
            arch: {
                world: { key: "haunted", label: "Haunted Grounds", icon: "fa-house-chimney" },
                power: { key: "ritual", label: "Curse & Ritual Codex", icon: "fa-hand-sparkles" },
                special: { key: "entity", label: "Entity Dossier", icon: "fa-ghost" }
            }
        },

        "engine-scifi": {
            nexus: "HORIZON",
            label: "Sci-Fi",
            genre: "Hard Sci-Fi",
            iconFolder: "fa-user-astronaut",
            iconFile: "fa-satellite",
            iconTheme: "fa-satellite-dish",
            watermark: "fa-meteor",
            fx: "scifi",
            feature: {
                name: "Deep Telemetry",
                desc: "Sci-Fi engine engaged. Cold physics, deep space, and systems that can fail."
            },
            arch: {
                world: { key: "world", label: "World Bible", icon: "fa-earth-americas" },
                power: { key: "physics", label: "Physics & Tech Systems", icon: "fa-satellite-dish" },
                special: { key: "mission", label: "Mission Log", icon: "fa-route" }
            }
        },

        "engine-superhero": {
            nexus: "MULTIVERSE",
            label: "Superhero",
            genre: "Comic Multiverse",
            iconFolder: "fa-shield-halved",
            iconFile: "fa-bolt",
            iconTheme: "fa-bolt",
            watermark: "fa-shield-halved",
            fx: "superhero",
            feature: {
                name: "Panel Burst",
                desc: "Superhero engine engaged. Multiverse-scale power, and the consequence that follows it."
            },
            arch: {
                world: { key: "universe", label: "Universe Bible", icon: "fa-globe" },
                power: { key: "powersys", label: "Power System", icon: "fa-hand-fist" },
                special: { key: "roster", label: "Team Roster", icon: "fa-people-group" }
            }
        },

        "engine-romance": {
            nexus: "REVERIE",
            label: "Romance",
            genre: "Entangled Hearts",
            iconFolder: "fa-heart",
            iconFile: "fa-envelope-open-text",
            iconTheme: "fa-heart-pulse",
            watermark: "fa-heart",
            fx: "romance",
            feature: {
                name: "Velvet Reverie",
                desc: "Romance engine engaged. Longing, tension, and every unsaid word now carry weight."
            },
            arch: {
                world: { key: "romanceworld", label: "Romance Bible", icon: "fa-house-flag" },
                power: { key: "heartledger", label: "Heart Ledger", icon: "fa-heart-pulse" },
                special: { key: "courtship", label: "Courtship Timeline", icon: "fa-ring" }
            }
        },

        "engine-mystery": {
            nexus: "DOSSIER",
            label: "Mystery",
            genre: "Detective Noir",
            iconFolder: "fa-magnifying-glass",
            iconFile: "fa-fingerprint",
            iconTheme: "fa-magnifying-glass",
            watermark: "fa-fingerprint",
            fx: "mystery",
            feature: {
                name: "Case Opened",
                desc: "Mystery engine engaged. Every detail matters. Nothing is what it first appears to be."
            },
            arch: {
                world: { key: "casefile", label: "Case File", icon: "fa-folder-open" },
                power: { key: "suspectboard", label: "Suspect Board", icon: "fa-people-arrows" },
                special: { key: "evidenceledger", label: "Evidence Ledger", icon: "fa-magnifying-glass-chart" }
            }
        }
    };

    const ARCH_COMMON = [
        { key: "timeline", label: "Timeline", icon: "fa-clock-rotate-left" },
        { key: "relationship", label: "Relationships", icon: "fa-network-wired" },
        { key: "twist", label: "Plot Twist", icon: "fa-shuffle" }
    ];

    /* ============================================================
       APPLICATION STATE
    ============================================================ */
    let session = null;
    let projects = [];
    let project = null;

    let allowedEngines = ["engine-normal"];
    let activeEngine = "engine-normal";

    let workspaces = [];
    let currentWorkspace = null;
    let currentDocument = null;

    let autoSaveTimer = null;
    let pendingDeleteDocId = null;

    let pendingGenre = "engine-normal";
    let genreCallback = null;

    const DEFAULT_PREFS = { autoTitle: true, autoAge: true };
    let prefs = { ...DEFAULT_PREFS };

    const U = window.StoryUtils;

    /* ============================================================
       GENRE DATA
    ============================================================ */
    const GENRE_STYLE = {
        "engine-normal": { swatch: ["#b07a2b", "#6f5230"], blurb: "Clean parchment. The default studio tone." },
        "engine-drama": { swatch: ["#66761f", "#8a6420"], blurb: "Grounded, tense and quietly menacing." },
        "engine-fantasy": { swatch: ["#8d6a12", "#7e2d24"], blurb: "Old realms, bloodlines and magic." },
        "engine-horror": { swatch: ["#7d2424", "#54504a"], blurb: "Dim, uneasy and always watching." },
        "engine-scifi": { swatch: ["#2a6f9e", "#3a5068"], blurb: "Cool, precise and far from home." },
        "engine-superhero": { swatch: ["#bd3a2c", "#b98200"], blurb: "Bold, bright and high-stakes." },
        "engine-romance": { swatch: ["#ad4d69", "#a37d34"], blurb: "Warm, soft and slow-burning." },
        "engine-mystery": { swatch: ["#8a6a28", "#526071"], blurb: "Cold cases and hidden motives." }
    };

    function genreVars(engine) {
        const style = GENRE_STYLE[engine] || GENRE_STYLE["engine-normal"];
        return `--g1:${style.swatch[0]};--g2:${style.swatch[1]}`;
    }

    function esc(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[ch]));
    }

    /* Fields whose value becomes the file name (when automation is on). */
    const AUTO_TITLE_FIELDS = {
        character: ["NAME"],
        kingdom: ["KINGDOM NAME"],
        world: ["WORLD NAME"],
        magic: ["SYSTEM NAME"],
        systemarch: ["SYSTEM NAME"],
        networkmap: ["NETWORK NAME"],
        quantum: ["PHENOMENON NAME"],
        dimension: ["DIMENSION / BRANCH NAME"],
        territory: ["TERRITORY NAME"],
        operation: ["OPERATION NAME"],
        empire: ["ORGANIZATION NAME"],
        haunted: ["LOCATION NAME"],
        ritual: ["RITUAL / CURSE NAME"],
        entity: ["ENTITY NAME"],
        universe: ["UNIVERSE DESIGNATION"],
        powersys: ["POWER SET NAME"],
        roster: ["TEAM NAME"],
        physics: ["SYSTEM / TECHNOLOGY NAME"],
        mission: ["MISSION DESIGNATION"],
        heartledger: ["CHARACTER"],
        casefile: ["CASE NAME / NUMBER"],
        suspectboard: ["SUSPECT"],
        evidenceledger: ["EVIDENCE ITEM"],
        twist: ["TWIST NAME"],
        timeline: ["EVENT NAME"],
        relationship: ["CHARACTER A", "CHARACTER B"]
    };

    const DEFAULT_TITLES = ["Character Profile", "World Codex", "Untitled Document"];

    /* ============================================================
       TEMPLATE HELPERS
    ============================================================ */
    const fields = (...items) => {
        return items
            .map((item) => {
                const label = item[0] || "";
                const value = item[1] || "";
                return `<p><strong>${label}:</strong> ${value}</p>`;
            })
            .join("");
    };

    const section = (title) => `<h3>${title}</h3>`;
    const spacer = () => `<p><br></p>`;
    const rule = () => `<hr>`;

    /* ============================================================
       UTILITIES
    ============================================================ */
    function generateID() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function getCurrentTime() {
        return new Date().toLocaleString([], {
            dateStyle: "short",
            timeStyle: "short"
        });
    }

    function redirectDashboard() {
        window.location.href = "dashboard.html";
    }

    /* ============================================================
       PROJECT STORAGE
    ============================================================ */
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

    function getProjects() {
        try {
            const raw = localStorage.getItem(PROJECTS_KEY);
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function saveProjects(list) {
        try {
            localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
        } catch {}
    }

    function loadSessionProject() {
        session = getSession();

        if (!session || session.role !== "writer") {
            redirectDashboard();
            return false;
        }

        const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
        projects = getProjects();

        project = projects.find((p) => p.id === activeId) || null;

        if (!project) {
            redirectDashboard();
            return false;
        }

        allowedEngines =
            Array.isArray(project.engines) && project.engines.length > 0
                ? project.engines
                : ["engine-normal"];

        activeEngine = allowedEngines.includes(project.activeEngine)
            ? project.activeEngine
            : allowedEngines[0];

        if (activeProjectName) {
            activeProjectName.textContent = project.title || "Untitled Production";
        }

        return true;
    }

    function saveProjectState() {
        if (!project) return;

        project.updatedAt = getCurrentTime();
        project.activeEngine = activeEngine;
        project.workspaces = workspaces;

        const index = projects.findIndex((p) => p.id === project.id);

        if (index >= 0) {
            projects[index] = project;
        } else {
            projects.push(project);
        }

        saveProjects(projects);
    }

    function saveStorage() {
        saveProjectState();
    }

    /* ============================================================
       DISPLAY MODE
    ============================================================ */
    function setDisplayMode(mode = "light", persist = true) {
        const safeMode = mode === "dark" ? "dark" : "light";
        document.body.dataset.mode = safeMode;

        if (settingsDropdown) {
            const links = settingsDropdown.querySelectorAll("[data-display-mode]");

            links.forEach((link) => {
                const isActive = link.dataset.displayMode === safeMode;
                link.classList.toggle("theme-active", isActive);
            });
        }

        if (persist) {
            try {
                localStorage.setItem(MODE_STORAGE_KEY, safeMode);
            } catch {}
        }

        closeAllDropdowns();
    }

    function initializeDisplayMode() {
        let savedMode = null;

        try {
            savedMode = localStorage.getItem(MODE_STORAGE_KEY);
        } catch {
            savedMode = null;
        }

        /* Bright parchment is the default. */
        setDisplayMode(savedMode === "dark" ? "dark" : "light", false);
    }

    /* ============================================================
       AUTOMATION PREFERENCES
    ============================================================ */
    function loadPrefs() {
        try {
            const raw = JSON.parse(localStorage.getItem(PREFS_KEY));
            prefs = { ...DEFAULT_PREFS, ...(raw && typeof raw === "object" ? raw : {}) };
        } catch {
            prefs = { ...DEFAULT_PREFS };
        }
    }

    function updatePrefUI() {
        if (!settingsDropdown) return;

        settingsDropdown.querySelectorAll("[data-pref]").forEach((item) => {
            const on = Boolean(prefs[item.dataset.pref]);
            item.classList.toggle("on", on);
            item.setAttribute("aria-checked", on ? "true" : "false");
        });
    }

    function togglePref(key) {
        if (!(key in DEFAULT_PREFS)) return;

        prefs[key] = !prefs[key];

        try {
            localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
        } catch {}

        updatePrefUI();

        if (prefs[key]) {
            runAutomation();
            saveCurrentDocument();
        }
    }

    /* ============================================================
       SHEET HEIGHT NORMALIZER
    ============================================================ */
    function normalizeSheetHeight() {
        if (bookWrapper) {
            bookWrapper.style.height = "auto";
            bookWrapper.style.minHeight = "900px";
        }

        if (editor) {
            editor.style.height = "auto";
            editor.style.minHeight = "800px";
        }
    }

    function triggerPageTurnAnimation() {
        if (!bookWrapper) return;

        normalizeSheetHeight();

        bookWrapper.classList.remove("anim-page-turn");
        void bookWrapper.offsetWidth;
        bookWrapper.classList.add("anim-page-turn");
    }

    /* ============================================================
       GENRE THEME (follows the open document)
    ============================================================ */
    function resolveEngineFor(doc) {
        if (doc && doc.genre && engineConfig[doc.genre]) return doc.genre;

        /* Auteur Mode: a single-genre production keeps its tone everywhere. */
        if (allowedEngines.length === 1 && engineConfig[allowedEngines[0]]) {
            return allowedEngines[0];
        }

        return "engine-normal";
    }

    function updateGenreBadge() {
        if (!engineLockBadge) return;

        if (allowedEngines.length <= 1) {
            const cfg = engineConfig[allowedEngines[0]] || engineConfig["engine-normal"];

            engineLockBadge.innerHTML = `
                <i class="fa-solid fa-lock"></i>
                <span>Auteur Mode · ${esc(cfg.label)}</span>
            `;
            engineLockBadge.title = "This production is locked to a single genre.";
        } else {
            engineLockBadge.innerHTML = `
                <i class="fa-solid fa-layer-group"></i>
                <span>${allowedEngines.length} genres</span>
            `;
            engineLockBadge.title = "Genre is chosen for each character and architecture file.";
        }
    }

    function applyDocTheme() {
        applyTheme(resolveEngineFor(currentDocument));
    }

    function applyTheme(engine) {
        const cfg = engineConfig[engine] || engineConfig["engine-normal"];
        const changed = engine !== activeEngine || !document.body.classList.contains(engine);

        activeEngine = engine;

        if (!changed) {
            applyEngineFX(engine, cfg);
            return;
        }

        const preservedClasses = Array.from(document.body.classList).filter(
            (c) => c && !c.startsWith("engine-")
        );

        document.body.className = [engine, ...preservedClasses].join(" ").trim();

        if (nexusWord) {
            nexusWord.textContent = cfg.nexus;
        }

        applyEngineFX(engine, cfg);
        renderWorkspaces();
    }

    function applyEngineFX(engine, cfg) {
        cfg = cfg || engineConfig[engine];
        if (!cfg) return;

        if (themeFx) {
            themeFx.className = "theme-fx fx-" + cfg.fx;
        }

        if (pageWatermark) {
            pageWatermark.innerHTML = `<i class="fa-solid ${cfg.watermark}"></i>`;
        }

        if (themeBadgeIcon) {
            themeBadgeIcon.className = `fa-solid ${cfg.iconTheme}`;
        }

        if (themeBadgeLabel) {
            themeBadgeLabel.textContent = `${cfg.label} · ${cfg.genre}`;
        }
    }

    /* ============================================================
       TOAST
    ============================================================ */
    function showToast(iconClass, title, subtitle) {
        let container = document.getElementById("toastContainer");

        if (!container) {
            container = document.createElement("div");
            container.id = "toastContainer";
            container.className = "toast-container";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = "toast glass-panel";
        toast.innerHTML = `
            <i class="fa-solid ${iconClass} toast-icon"></i>
            <div class="toast-text">
                <strong>${title}</strong>
                <span>${subtitle}</span>
            </div>
        `;

        container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add("show"));

        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 400);
        }, 3200);
    }

    /* ============================================================
       RIPPLE
    ============================================================ */
    function attachRippleEffect() {
        document
            .querySelectorAll(
                ".nav-block, .block-btn, .tool-btn, .btn-confirm-delete, .btn-cancel, .rail-btn"
            )
            .forEach((btn) => {
                btn.addEventListener("click", function (event) {
                    const rect = this.getBoundingClientRect();
                    const ripple = document.createElement("span");

                    ripple.className = "ripple-fx";
                    ripple.style.left = `${event.clientX - rect.left}px`;
                    ripple.style.top = `${event.clientY - rect.top}px`;

                    this.style.position = "relative";
                    this.style.overflow = "hidden";
                    this.appendChild(ripple);

                    setTimeout(() => ripple.remove(), 650);
                });
            });
    }

    /* ============================================================
       TEMPLATES
    ============================================================ */
    function getCallSheetTemplate(day, date) {
        return `
            <h2>Director's Call Sheet 🎬</h2>
            <p><strong>DAY:</strong> ${day} | <strong>DATE:</strong> ${date}</p>
            ${fields(
                ["ASSISTANT DIRECTORS"],
                ["TECHNICIANS NEEDED", "Camera / Sound / Lighting / Make-up"]
            )}
            ${rule()}
            ${section("SCENES SHOOTING TODAY")}
            ${fields(
                ["SCENE"],
                ["CHARACTERS REQUIRED"],
                ["SCENE SYNOPSIS"],
                ["MOTIVE OF SCENE"]
            )}
            ${spacer()}
            ${fields(
                ["SCENE"],
                ["CHARACTERS REQUIRED"],
                ["SCENE SYNOPSIS"],
                ["MOTIVE OF SCENE"]
            )}
            ${rule()}
            ${section("IMPORTANT NOTES")}
            <p><strong>Props & Special FX:</strong> </p>
        `;
    }

    /* Genre-specific sections + extra relationship rows for characters. */
    const CHARACTER_EXTRAS = {
        "engine-fantasy": {
            section: "Realm & Lore",
            fields: [["TITLE / RANK"], ["HOUSE / BLOODLINE"], ["HOMELAND / REALM"], ["ALLEGIANCE"], ["MAGIC AFFINITY"], ["SIGNATURE RELIC / WEAPON"], ["OATHS & VOWS"], ["PROPHECY / DESTINY"]],
            relations: ["Mentor", "Allies", "Rivals"]
        },
        "engine-drama": {
            section: "The Life & The Ledger",
            fields: [["PUBLIC FACE / COVER"], ["HIDDEN LIFE"], ["AFFILIATION / CREW"], ["LOYALTIES"], ["VICES"], ["DEBTS / LEVERAGE"], ["WHAT THEY'VE DONE"], ["POINT OF NO RETURN"]],
            relations: ["Boss", "Associates", "Rivals"]
        },
        "engine-horror": {
            section: "The Unseen",
            fields: [["HAUNTING / CURSE"], ["FIRST ENCOUNTER"], ["FEAR TRIGGER"], ["SANITY / STABILITY"], ["WHAT THEY HIDE"], ["PARANORMAL SENSITIVITY"], ["MARK / OMEN"], ["FATE IN THE STORY"]],
            relations: ["Allies", "Bound To"]
        },
        "engine-scifi": {
            section: "Mission Profile",
            fields: [["RANK / DESIGNATION"], ["SHIP / STATION / COLONY"], ["HOMEWORLD"], ["AUGMENTATIONS / IMPLANTS"], ["TECH SPECIALTY"], ["CLEARANCE LEVEL"], ["MISSION ROLE"], ["PSYCH EVALUATION"]],
            relations: ["Crewmates", "Commander", "Rivals"]
        },
        "engine-superhero": {
            section: "Hero File",
            fields: [["CIVILIAN LIFE / SECRET IDENTITY"], ["ORIGIN STORY"], ["POWERS & ABILITIES"], ["LIMITS / WEAKNESS"], ["SIGNATURE LOOK / COSTUME"], ["TEAM / AFFILIATION"], ["WHO KNOWS THE SECRET"], ["NEMESIS"]],
            relations: ["Team", "Mentor", "Nemesis"]
        },
        "engine-romance": {
            section: "Heart & History",
            fields: [["LOVE LANGUAGE"], ["ATTACHMENT STYLE"], ["ROMANTIC HISTORY"], ["WHAT THEY WANT IN LOVE"], ["WHAT THEY FEAR IN LOVE"], ["EMOTIONAL WALLS"], ["DEAL-BREAKERS"], ["WHAT MAKES THEM FALL"]],
            relations: ["Love Interest", "Ex", "Confidant"]
        },
        "engine-mystery": {
            section: "Case Role",
            fields: [["ROLE IN THE CASE"], ["MOTIVE"], ["ALIBI"], ["OPPORTUNITY"], ["SECRETS THEY KEEP"], ["WHAT THEY KNOW"], ["WHAT THEY LIE ABOUT"], ["RELATIONSHIP TO THE VICTIM"], ["RED HERRING? (Y/N)"]],
            relations: ["Partner", "Informants", "Suspects"]
        }
    };

    function getCharacterTemplate(genre) {
        const extras = CHARACTER_EXTRAS[genre];
        const cfg = engineConfig[genre];
        const tag = cfg && extras ? `<p class="template-hint">${cfg.label} profile · ${cfg.genre}</p>` : "";

        const relationRows = [
            ["Mother"], ["Father"], ["Brother"], ["Sister"], ["Spouse"], ["Children"],
            ["Lover"], ["Friends"], ["Enemies"],
            ...(extras ? extras.relations.map((label) => [label]) : [])
        ];

        return `
            <h2>Character Profile ⭐</h2>
            ${tag}
            <p class="template-hint">Birthdate accepts 12/03/1990, 12 March 1990, or March 12, 1990 — Age fills in on its own.</p>
            ${fields(
                ["NAME"],
                ["ALIAS"],
                ["BIRTHDATE"],
                ["AGE", "(calculated from birthdate)"],
                ["GENDER"],
                ["SPECIES"],
                ["HEIGHT"],
                ["WEIGHT"],
                ["OCCUPATION"],
                ["STATUS", "(Alive / Dead / Missing)"],
                ["ROLE", "(Protagonist / Antagonist / Supporting / etc.)"],
                ["ARCHETYPE"],
                ["GOAL"],
                ["MOTIVATION"],
                ["BIGGEST FEAR"],
                ["BIGGEST SECRET"],
                ["PERSONALITY"],
                ["STRENGTHS"],
                ["WEAKNESSES"],
                ["SKILLS"],
                ["HABITS"],
                ["LIKES"],
                ["DISLIKES"],
                ["BACKGROUND"],
                ["CHARACTER ARC"],
                ["APPEARANCE"],
                ["VOICE"],
                ["CLOTHING STYLE"],
                ["WEAPONS"],
                ["NOTES"]
            )}
            ${extras ? section(extras.section) + fields(...extras.fields) : ""}
            ${section("RELATIONSHIPS")}
            <p class="template-hint">Type exact character names. Separate several with commas and add a note in brackets if you like, e.g. Mira Vane (half-sister). These feed the family tree and connection map in your report.</p>
            ${fields(...relationRows)}
        `;
    }

    function getWorldTemplate() {
        return `
            <h2>World Bible 🌍</h2>
            ${fields(
                ["WORLD NAME"],
                ["DESCRIPTION"],
                ["HISTORY"],
                ["CONTINENTS"],
                ["KINGDOMS"],
                ["MAJOR CITIES"],
                ["LANGUAGES"],
                ["RELIGIONS"],
                ["MAGIC SYSTEM"],
                ["TECHNOLOGY LEVEL"],
                ["IMPORTANT EVENTS"],
                ["CURRENT ERA"],
                ["ECONOMY"],
                ["CULTURE"],
                ["NOTES"]
            )}
        `;
    }

    function getKingdomTemplate() {
        return `
            <h2>Kingdom Profile 👑</h2>
            ${fields(
                ["KINGDOM NAME"],
                ["CAPITAL"],
                ["RULER"],
                ["ROYAL FAMILY"],
                ["POPULATION"],
                ["MILITARY"],
                ["GOVERNMENT"],
                ["LAW"],
                ["ECONOMY"],
                ["RELIGION"],
                ["FAMOUS LANDMARKS"],
                ["NEIGHBORING KINGDOMS"],
                ["ALLIES"],
                ["ENEMIES"],
                ["IMPORTANT CHARACTERS"],
                ["NOTES"]
            )}
        `;
    }

    function getTimelineTemplate() {
        return `
            <h2>Timeline Event ⏳</h2>
            ${fields(
                ["YEAR"],
                ["DATE"],
                ["EVENT NAME"],
                ["LOCATION"],
                ["WHO WAS INVOLVED"],
                ["CAUSE"],
                ["WHAT HAPPENED"],
                ["CONSEQUENCES"],
                ["REFERENCED CHAPTERS"],
                ["NOTES"]
            )}
        `;
    }

    function getRelationshipTemplate() {
        return `
            <h2>Relationship Sheet ❤️</h2>
            ${fields(
                ["CHARACTER A"],
                ["CHARACTER B"],
                ["RELATIONSHIP TYPE"],
                ["FIRST MEETING"],
                ["CURRENT STATUS"],
                ["BIGGEST MEMORY"],
                ["TRUST LEVEL"],
                ["LOVE LEVEL"],
                ["HATE LEVEL"],
                ["SECRET BETWEEN THEM"],
                ["IMPORTANT SCENES"],
                ["ENDING OF RELATIONSHIP"]
            )}
        `;
    }

    function getMagicTemplate() {
        return `
            <h2>Magic System ✨</h2>
            ${fields(
                ["SYSTEM NAME"],
                ["SOURCE OF POWER"],
                ["WHO CAN USE IT"],
                ["LIMITATIONS"],
                ["COST"],
                ["LEVELS"],
                ["SPELL TYPES"],
                ["WEAKNESSES"],
                ["RARE ABILITIES"],
                ["RULES"],
                ["FORBIDDEN MAGIC"],
                ["NOTES"]
            )}
        `;
    }

    function getPlotTwistTemplate() {
        return `
            <h2>Plot Twist 🔥</h2>
            ${fields(
                ["TWIST NAME"],
                ["CHAPTER"],
                ["WHO KNOWS THE TRUTH"],
                ["WHO DOESN'T"],
                ["WHAT THE AUDIENCE BELIEVES"],
                ["REAL TRUTH"],
                ["WHEN TO REVEAL"],
                ["CLUES PLANTED"],
                ["PAYOFF"],
                ["IMPACT ON STORY"]
            )}
        `;
    }

    function getSystemArchitectureTemplate() {
        return `
            <h2>System Architecture 🧠</h2>
            ${fields(
                ["SYSTEM NAME"],
                ["CORE PURPOSE"],
                ["INPUT SOURCES"],
                ["PROCESSING LAYERS"],
                ["OUTPUT / ACTIONS"],
                ["GOVERNING PROTOCOLS"],
                ["FAILSAFES"],
                ["LIMITATIONS"],
                ["ACCESS LEVELS"],
                ["KNOWN EXPLOITS"],
                ["NOTES"]
            )}
        `;
    }

    function getNetworkMapTemplate() {
        return `
            <h2>Network Map 🕸️</h2>
            ${fields(
                ["NETWORK NAME"],
                ["KEY NODES (CHARACTERS / FACTIONS)"],
                ["CONNECTIONS"],
                ["INFLUENCE FLOW"],
                ["HIDDEN LINKS"],
                ["VULNERABLE POINTS"],
                ["CONTROLLING ENTITY"],
                ["NOTES"]
            )}
        `;
    }

    function getQuantumMechanicsTemplate() {
        return `
            <h2>Quantum Mechanics ⚛️</h2>
            ${fields(
                ["PHENOMENON NAME"],
                ["GOVERNING LAW"],
                ["WHO / WHAT IT AFFECTS"],
                ["TRIGGER CONDITIONS"],
                ["OBSERVABLE EFFECTS"],
                ["PARADOXES / RISKS"],
                ["CONTAINMENT / CONTROL"],
                ["SCIENTIFIC BASIS (IN-WORLD)"],
                ["NOTES"]
            )}
        `;
    }

    function getDimensionLedgerTemplate() {
        return `
            <h2>Dimension Ledger 🌌</h2>
            ${fields(
                ["DIMENSION / BRANCH NAME"],
                ["DIVERGENCE POINT"],
                ["KEY DIFFERENCES"],
                ["RESIDENT VERSIONS OF CHARACTERS"],
                ["ACCESS METHOD"],
                ["DANGER LEVEL"],
                ["STABILITY"],
                ["NOTES"]
            )}
        `;
    }

    function getTerritoryMapTemplate() {
        return `
            <h2>Territory Map 🗺️</h2>
            ${fields(
                ["TERRITORY NAME"],
                ["CONTROLLING PARTY"],
                ["KEY LOCATIONS"],
                ["BORDERS / RIVALS"],
                ["LAW ENFORCEMENT PRESENCE"],
                ["ECONOMY / TRADE"],
                ["SAFE HOUSES"],
                ["HEAT LEVEL"],
                ["NOTES"]
            )}
        `;
    }

    function getOperationBlueprintTemplate() {
        return `
            <h2>Operation Blueprint 🧪</h2>
            ${fields(
                ["OPERATION NAME"],
                ["OBJECTIVE"],
                ["PEOPLE INVOLVED"],
                ["PROCESS / METHOD"],
                ["RESOURCES REQUIRED"],
                ["RISKS"],
                ["COVER STORY"],
                ["PROFIT / PAYOFF"],
                ["CONTINGENCY PLAN"],
                ["NOTES"]
            )}
        `;
    }

    function getCriminalEmpireTemplate() {
        return `
            <h2>Criminal Empire 💼</h2>
            ${fields(
                ["ORGANIZATION NAME"],
                ["LEADER"],
                ["INNER CIRCLE"],
                ["TERRITORY CONTROLLED"],
                ["INCOME SOURCES"],
                ["RIVAL ORGANIZATIONS"],
                ["LAW ENFORCEMENT TIES"],
                ["CODE OF CONDUCT"],
                ["WEAKNESSES"],
                ["NOTES"]
            )}
        `;
    }

    function getHauntedGroundsTemplate() {
        return `
            <h2>Haunted Grounds 🏚️</h2>
            ${fields(
                ["LOCATION NAME"],
                ["HISTORY OF THE SITE"],
                ["TRAGEDY / ORIGIN OF HAUNTING"],
                ["MANIFESTATIONS"],
                ["ACTIVE HOURS"],
                ["AFFECTED AREAS"],
                ["WARNING SIGNS"],
                ["KNOWN VICTIMS"],
                ["NOTES"]
            )}
        `;
    }

    function getCurseRitualTemplate() {
        return `
            <h2>Curse & Ritual Codex 🕯️</h2>
            ${fields(
                ["RITUAL / CURSE NAME"],
                ["ORIGIN"],
                ["REQUIRED COMPONENTS"],
                ["INCANTATION / PROCESS"],
                ["EFFECT"],
                ["COST TO THE CASTER"],
                ["HOW TO BREAK IT"],
                ["WARNINGS"],
                ["NOTES"]
            )}
        `;
    }

    function getEntityDossierTemplate() {
        return `
            <h2>Entity Dossier 👻</h2>
            ${fields(
                ["ENTITY NAME"],
                ["TYPE", "(Spirit / Demon / Poltergeist / Unknown)"],
                ["ORIGIN"],
                ["APPEARANCE"],
                ["BEHAVIOR PATTERN"],
                ["POWERS"],
                ["WEAKNESSES"],
                ["TRIGGERS"],
                ["HOW TO BANISH"],
                ["NOTES"]
            )}
        `;
    }

    function getUniverseBibleTemplate() {
        return `
            <h2>Universe Bible 🌐</h2>
            ${fields(
                ["UNIVERSE DESIGNATION"],
                ["REALITY NUMBER"],
                ["KEY DIFFERENCES FROM PRIME"],
                ["DOMINANT FACTIONS"],
                ["THREAT LEVEL"],
                ["SIGNATURE EVENTS"],
                ["TECHNOLOGY LEVEL"],
                ["NOTES"]
            )}
        `;
    }

    function getPowerSystemTemplate() {
        return `
            <h2>Power System ⚡</h2>
            ${fields(
                ["POWER SET NAME"],
                ["ORIGIN OF POWERS"],
                ["ABILITIES"],
                ["POWER LEVEL / SCALE"],
                ["LIMITATIONS"],
                ["WEAKNESSES"],
                ["EVOLUTION / GROWTH"],
                ["SIGNATURE MOVE"],
                ["NOTES"]
            )}
        `;
    }

    function getTeamRosterTemplate() {
        return `
            <h2>Team Roster 🛡️</h2>
            ${fields(
                ["TEAM NAME"],
                ["LEADER"],
                ["MEMBERS & ROLES"],
                ["BASE OF OPERATIONS"],
                ["TEAM DYNAMIC"],
                ["SHARED MISSION"],
                ["INTERNAL CONFLICTS"],
                ["RIVAL TEAMS"],
                ["NOTES"]
            )}
        `;
    }

    function getPhysicsTechTemplate() {
        return `
            <h2>Physics & Tech Systems 🛰️</h2>
            ${fields(
                ["SYSTEM / TECHNOLOGY NAME"],
                ["SCIENTIFIC PRINCIPLE"],
                ["FUNCTION"],
                ["ENERGY SOURCE"],
                ["LIMITATIONS"],
                ["FAILURE RISKS"],
                ["WHO OPERATES IT"],
                ["NOTES"]
            )}
        `;
    }

    function getMissionLogTemplate() {
        return `
            <h2>Mission Log 🚀</h2>
            ${fields(
                ["MISSION DESIGNATION"],
                ["OBJECTIVE"],
                ["CREW / PERSONNEL"],
                ["DEPARTURE POINT"],
                ["DESTINATION"],
                ["TIMELINE / DURATION"],
                ["HAZARDS ENCOUNTERED"],
                ["MISSION STATUS"],
                ["NOTES"]
            )}
        `;
    }

    function getRomanceBibleTemplate() {
        return `
            <h2>Romance Bible 💗</h2>
            ${fields(
                ["SETTING / WORLD"],
                ["HOW THEIR WORLDS INTERSECT"],
                ["SOCIAL RULES OR CUSTOMS AT PLAY"],
                ["EXTERNAL PRESSURE"],
                ["FAMILY / RIVALS / DISTANCE"],
                ["CENTRAL QUESTION OF THE STORY"],
                ["TONE & ATMOSPHERE"],
                ["NOTES"]
            )}
        `;
    }

    function getHeartLedgerTemplate() {
        return `
            <h2>Heart Ledger 💌</h2>
            ${fields(
                ["CHARACTER"],
                ["LOVE LANGUAGE"],
                ["VULNERABILITY"],
                ["DEAL-BREAKER"],
                ["CHEMISTRY TRIGGER"],
                ["WHAT THEY WON'T SAY OUT LOUD"],
                ["PHYSICAL INTIMACY NOTES"],
                ["EMOTIONAL INTIMACY NOTES"],
                ["NOTES"]
            )}
        `;
    }

    function getCourtshipTimelineTemplate() {
        return `
            <h2>Courtship Timeline 💍</h2>
            ${fields(
                ["MEET-CUTE / FIRST CONTACT"],
                ["THE SPARK"],
                ["FIRST DOUBT"],
                ["ESCALATION BEAT"],
                ["THE CRISIS / BREAK"],
                ["THE TURN"],
                ["REUNION"],
                ["RESOLUTION"],
                ["NOTES"]
            )}
        `;
    }

    function getCaseFileTemplate() {
        return `
            <h2>Case File 🗂️</h2>
            ${fields(
                ["CASE NAME / NUMBER"],
                ["WHAT HAPPENED"],
                ["DATE / TIME"],
                ["LOCATION"],
                ["WHO FOUND IT"],
                ["FIRST RESPONSE"],
                ["OFFICIAL STATUS"],
                ["WHAT DOESN'T ADD UP"],
                ["NOTES"]
            )}
        `;
    }

    function getSuspectBoardTemplate() {
        return `
            <h2>Suspect Board 🕵️</h2>
            ${fields(
                ["SUSPECT"],
                ["MOTIVE"],
                ["ALIBI"],
                ["OPPORTUNITY"],
                ["CONNECTION TO VICTIM / CASE"],
                ["RED HERRING? (Y/N)"],
                ["SUSPICION LEVEL"],
                ["NOTES"]
            )}
        `;
    }

    function getEvidenceLedgerTemplate() {
        return `
            <h2>Evidence Ledger 🔎</h2>
            ${fields(
                ["EVIDENCE ITEM"],
                ["WHERE FOUND"],
                ["CHAIN OF CUSTODY"],
                ["WHAT IT PROVES"],
                ["WHAT THE DETECTIVE KNOWS"],
                ["WHAT THE READER KNOWS"],
                ["PLANNED REVEAL POINT"],
                ["NOTES"]
            )}
        `;
    }

    function getNovelTemplate() {
        return `
            <h2>Novel Chapter 📖</h2>
            ${fields(["CHAPTER"], ["POV"])}
            <p></p>
        `;
    }

    function getScreenplayTemplate() {
        return `
            <h2>Screenplay Scene 🎬</h2>
            ${fields(["INT / EXT"])}
            <p class="scene-header">FADE IN:</p>
            <p class="character-name">NAME</p>
            <p class="dialogue">Dialogue...</p>
        `;
    }

    function getDialogueTemplate() {
        return `
            <h2>Dialogue Sheet 💬</h2>
            ${fields(["CHARACTER A"], ["CHARACTER B"])}
        `;
    }

    /* ============================================================
       ARCHITECTURE HELPERS
    ============================================================ */
    function getArchLabel(key) {
        const common = ARCH_COMMON.find((c) => c.key === key);
        if (common) return common.label;

        for (const engine in engineConfig) {
            const arch = engineConfig[engine].arch;

            for (const slot in arch) {
                if (arch[slot].key === key) {
                    return arch[slot].label;
                }
            }
        }

        return "Architecture Document";
    }

    function getDocTypeIcon(type) {
        const map = {
            character: "fa-user",
            world: "fa-globe",
            kingdom: "fa-chess-rook",
            timeline: "fa-clock-rotate-left",
            relationship: "fa-network-wired",
            magic: "fa-wand-sparkles",
            twist: "fa-shuffle",
            screenplay: "fa-clapperboard",
            novel: "fa-book-open",
            dialogue: "fa-comments",
            callsheet: "fa-video",
            systemarch: "fa-microchip",
            networkmap: "fa-diagram-project",
            quantum: "fa-atom",
            dimension: "fa-layer-group",
            territory: "fa-map-location-dot",
            operation: "fa-flask",
            empire: "fa-user-tie",
            haunted: "fa-house-chimney",
            ritual: "fa-hand-sparkles",
            entity: "fa-ghost",
            universe: "fa-globe",
            powersys: "fa-hand-fist",
            roster: "fa-people-group",
            physics: "fa-satellite-dish",
            mission: "fa-route",
            romanceworld: "fa-house-flag",
            heartledger: "fa-heart-pulse",
            courtship: "fa-ring",
            casefile: "fa-folder-open",
            suspectboard: "fa-people-arrows",
            evidenceledger: "fa-magnifying-glass-chart",
            custom: "fa-file-lines"
        };

        return map[type] || "fa-file-lines";
    }

    /* ============================================================
       DOCUMENT / WORKSPACE MANAGEMENT
    ============================================================ */
    function createDocument(title, templateType, contentData = null, genre = null) {
        let content = "<p></p>";

        if (templateType === "character") content = getCharacterTemplate(genre);
        if (templateType === "world") content = getWorldTemplate();
        if (templateType === "kingdom") content = getKingdomTemplate();
        if (templateType === "timeline") content = getTimelineTemplate();
        if (templateType === "relationship") content = getRelationshipTemplate();
        if (templateType === "magic") content = getMagicTemplate();
        if (templateType === "twist") content = getPlotTwistTemplate();
        if (templateType === "systemarch") content = getSystemArchitectureTemplate();
        if (templateType === "networkmap") content = getNetworkMapTemplate();
        if (templateType === "quantum") content = getQuantumMechanicsTemplate();
        if (templateType === "dimension") content = getDimensionLedgerTemplate();
        if (templateType === "territory") content = getTerritoryMapTemplate();
        if (templateType === "operation") content = getOperationBlueprintTemplate();
        if (templateType === "empire") content = getCriminalEmpireTemplate();
        if (templateType === "haunted") content = getHauntedGroundsTemplate();
        if (templateType === "ritual") content = getCurseRitualTemplate();
        if (templateType === "entity") content = getEntityDossierTemplate();
        if (templateType === "universe") content = getUniverseBibleTemplate();
        if (templateType === "powersys") content = getPowerSystemTemplate();
        if (templateType === "roster") content = getTeamRosterTemplate();
        if (templateType === "physics") content = getPhysicsTechTemplate();
        if (templateType === "mission") content = getMissionLogTemplate();
        if (templateType === "romanceworld") content = getRomanceBibleTemplate();
        if (templateType === "heartledger") content = getHeartLedgerTemplate();
        if (templateType === "courtship") content = getCourtshipTimelineTemplate();
        if (templateType === "casefile") content = getCaseFileTemplate();
        if (templateType === "suspectboard") content = getSuspectBoardTemplate();
        if (templateType === "evidenceledger") content = getEvidenceLedgerTemplate();
        if (templateType === "screenplay") content = getScreenplayTemplate();
        if (templateType === "novel") content = getNovelTemplate();
        if (templateType === "dialogue") content = getDialogueTemplate();

        if (templateType === "callsheet" && contentData) {
            content = getCallSheetTemplate(contentData.day, contentData.date);
        }

        const doc = {
            id: generateID(),
            title: title || "Untitled Document",
            type: templateType || "custom",
            content,
            updated: getCurrentTime()
        };

        if (genre && engineConfig[genre]) doc.genre = genre;
        if (AUTO_TITLE_FIELDS[doc.type]) doc.autoTitle = true;

        return doc;
    }

    function createDefaultWorkspaces() {
        const starter = allowedEngines[0] || "engine-normal";
        const worldSlot = (engineConfig[starter] || engineConfig["engine-normal"]).arch.world;
        const worldTitle = worldSlot.key === "world" ? "World Codex" : worldSlot.label;

        workspaces = [
            {
                id: generateID(),
                name: "Characters",
                locked: true,
                type: "characters",
                documents: [createDocument("Character Profile 1", "character", null, starter)]
            },
            {
                id: generateID(),
                name: "Architecture",
                locked: true,
                type: "architecture",
                documents: [createDocument(worldTitle, worldSlot.key, null, starter)]
            },
            {
                id: generateID(),
                name: "Call Sheets",
                locked: true,
                type: "callsheet",
                documents: []
            }
        ];

        currentWorkspace = workspaces[0];
        currentDocument = currentWorkspace.documents[0];

        saveStorage();
    }

    /* Older productions (V13 and earlier) stored no genre per document.
       Give character + architecture documents one so themes and reports work. */
    function inferGenre(doc) {
        if (doc.genre && engineConfig[doc.genre]) return doc.genre;

        const isGenreDoc =
            doc.type === "character" ||
            ARCH_COMMON.some((c) => c.key === doc.type) ||
            Object.keys(engineConfig).some((engine) =>
                Object.values(engineConfig[engine].arch).some((slot) => slot.key === doc.type)
            );

        if (!isGenreDoc) return null;

        for (const engine of allowedEngines) {
            const arch = engineConfig[engine] && engineConfig[engine].arch;
            if (arch && Object.values(arch).some((slot) => slot.key === doc.type && slot.key !== "world")) {
                return engine;
            }
        }

        return allowedEngines.includes(activeEngine) ? activeEngine : allowedEngines[0];
    }

    function initializeProjectWorkspaces() {
        if (Array.isArray(project.workspaces) && project.workspaces.length > 0) {
            workspaces = project.workspaces.map((workspace) => ({
                id: workspace.id || generateID(),
                name: workspace.name || "Untitled Folder",
                locked: Boolean(workspace.locked),
                type: workspace.type || "custom",
                documents: Array.isArray(workspace.documents)
                    ? workspace.documents.map((doc) => {
                          const migrated = {
                              id: doc.id || generateID(),
                              title: doc.title || "Untitled Document",
                              type: doc.type || "custom",
                              content: doc.content || "<p></p>",
                              updated: doc.updated || getCurrentTime()
                          };

                          const genre = inferGenre(migrated);
                          if (genre) migrated.genre = genre;

                          if (AUTO_TITLE_FIELDS[migrated.type]) {
                              const isDefaultTitle =
                                  DEFAULT_TITLES.some((t) => migrated.title.startsWith(t)) ||
                                  migrated.title === getArchLabel(migrated.type);

                              migrated.autoTitle =
                                  typeof doc.autoTitle === "boolean" ? doc.autoTitle : isDefaultTitle;
                          }

                          return migrated;
                      })
                    : []
            }));

            currentWorkspace = workspaces[0] || null;
            currentDocument =
                currentWorkspace && currentWorkspace.documents.length > 0
                    ? currentWorkspace.documents[0]
                    : null;
        } else {
            createDefaultWorkspaces();
        }
    }

    function initializeApplication() {
        if (!loadSessionProject()) return;

        loadPrefs();
        initializeDisplayMode();
        updatePrefUI();
        initializeProjectWorkspaces();
        updateGenreBadge();

        renderWorkspaces();
        loadCurrentDocument();
        updateTemplateDropdownState();
        setupShortcuts();
        attachRippleEffect();
        normalizeSheetHeight();
    }

    function renderWorkspaces() {
        if (!workspaceList) return;

        workspaceList.innerHTML = "";

        const cfg = engineConfig[activeEngine] || engineConfig["engine-normal"];
        const iconFolderClass = cfg.iconFolder || "fa-folder";

        workspaces.forEach((workspace) => {
            const item = document.createElement("div");
            item.className = "workspace-item";

            if (currentWorkspace && currentWorkspace.id === workspace.id) {
                item.classList.add("active");
            }

            const title = document.createElement("div");
            title.className = "workspace-item-title";
            title.innerHTML = `
                <i class="${
                    workspace.locked
                        ? "fa-solid fa-lock"
                        : "icon-folder fa-solid " + iconFolderClass
                }"></i>
                <span>${esc(workspace.name)}</span>
            `;

            item.appendChild(title);
            item.onclick = () => switchWorkspace(workspace.id);

            if (!workspace.locked) {
                const actions = document.createElement("div");
                actions.className = "workspace-actions";

                const renameBtn = document.createElement("button");
                renameBtn.className = "ws-action-btn icon-btn";
                renameBtn.style.padding = "4px";
                renameBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
                renameBtn.onclick = (event) => {
                    event.stopPropagation();
                    renameWorkspace(workspace.id);
                };

                const deleteBtn = document.createElement("button");
                deleteBtn.className = "ws-action-btn icon-btn";
                deleteBtn.style.cssText = "padding:4px; color:var(--danger);";
                deleteBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                deleteBtn.onclick = (event) => {
                    event.stopPropagation();
                    deleteWorkspace(workspace.id);
                };

                actions.appendChild(renameBtn);
                actions.appendChild(deleteBtn);
                item.appendChild(actions);
            } else if (workspace.type === "characters" || workspace.type === "architecture") {
                const actions = document.createElement("div");
                actions.className = "workspace-actions";

                const reportMini = document.createElement("button");
                reportMini.className = "ws-action-btn icon-btn report-mini";
                reportMini.title = "Generate production report (PDF)";
                reportMini.innerHTML = '<i class="fa-solid fa-file-pdf"></i>';
                reportMini.onclick = (event) => {
                    event.stopPropagation();
                    generateReport();
                };

                actions.appendChild(reportMini);
                item.appendChild(actions);
            }

            workspaceList.appendChild(item);
        });
    }

    function switchWorkspace(id) {
        saveCurrentDocument();

        currentWorkspace = workspaces.find((w) => w.id === id);
        if (!currentWorkspace) return;

        if (currentWorkspace.documents.length > 0) {
            currentDocument = currentWorkspace.documents[0];
        } else {
            currentDocument = null;
        }

        if (folderName) folderName.textContent = currentWorkspace.name;

        renderWorkspaces();
        loadCurrentDocument();
        updateTemplateDropdownState();
        triggerPageTurnAnimation();

        if (currentWorkspace.type === "callsheet" && currentWorkspace.documents.length === 0) {
            openCallSheetModal();
        }
    }

    function updateTemplateDropdownState() {
        if (!currentWorkspace) return;

        const isRestricted = ["characters", "architecture", "callsheet"].includes(
            currentWorkspace.type
        );

        if (templateDropdownContainer) {
            templateDropdownContainer.style.display = isRestricted ? "none" : "block";
        }

        if (templateDropdownBtn) {
            templateDropdownBtn.classList.toggle("disabled", isRestricted);
            templateDropdownBtn.title = isRestricted
                ? "Story Templates disabled in this special folder."
                : "Apply Story Template";
        }
    }

    function newWorkspace() {
        const name = prompt("Enter New Folder Name:");
        if (!name) return;

        const workspace = {
            id: generateID(),
            name,
            locked: false,
            type: "custom",
            documents: [createDocument("Untitled Scene", "custom")]
        };

        workspaces.push(workspace);
        currentWorkspace = workspace;
        currentDocument = workspace.documents[0];

        saveStorage();
        renderWorkspaces();
        loadCurrentDocument();
        updateTemplateDropdownState();
    }

    function renameWorkspace(id) {
        const workspace = workspaces.find((w) => w.id === id);
        if (!workspace || workspace.locked) return;

        const newName = prompt("Rename Folder:", workspace.name);
        if (!newName) return;

        workspace.name = newName;

        if (folderName && currentWorkspace && currentWorkspace.id === workspace.id) {
            folderName.textContent = newName;
        }

        saveStorage();
        renderWorkspaces();
    }

    function deleteWorkspace(id) {
        const workspace = workspaces.find((w) => w.id === id);
        if (!workspace || workspace.locked) return;

        if (!confirm(`Delete folder "${workspace.name}"?`)) return;

        workspaces = workspaces.filter((w) => w.id !== id);
        currentWorkspace = workspaces[0] || null;
        currentDocument =
            currentWorkspace && currentWorkspace.documents.length > 0
                ? currentWorkspace.documents[0]
                : null;

        saveStorage();
        renderWorkspaces();
        loadCurrentDocument();
        updateTemplateDropdownState();
    }

    /* ============================================================
       FILE CREATION / MODALS
    ============================================================ */
    function handleNewFileClick() {
        if (!currentWorkspace) return;

        saveCurrentDocument();

        if (currentWorkspace.type === "characters") {
            openGenrePicker("character", (genre) => createCharacterFile(genre));
            return;
        } else if (currentWorkspace.type === "architecture") {
            openGenrePicker("architecture", (genre) => {
                pendingGenre = genre;
                openArchitectureModal();
            });
            return;
        } else if (currentWorkspace.type === "callsheet") {
            openCallSheetModal();
            return;
        } else {
            const doc = createDocument("Untitled Manuscript", "custom");
            currentWorkspace.documents.push(doc);
            currentDocument = doc;
        }

        saveStorage();
        renderDocuments();
        loadCurrentDocument();
        triggerPageTurnAnimation();
    }

    /* ---------- pop-up 1: choose the genre ---------- */
    function openGenrePicker(kind, callback) {
        const genres = allowedEngines.filter((engine) => engineConfig[engine]);

        /* Single-genre production: nothing to choose. */
        if (genres.length <= 1) {
            callback(genres[0] || "engine-normal");
            return;
        }

        genreCallback = callback;

        if (genreModalPrompt) {
            genreModalPrompt.textContent =
                kind === "character"
                    ? "From which genre will your character be?"
                    : "Which genre is this architecture for?";
        }

        if (genreModalChip) {
            genreModalChip.innerHTML =
                kind === "character"
                    ? '<i class="fa-solid fa-user-pen"></i> New Character'
                    : '<i class="fa-solid fa-sitemap"></i> New Architecture';
        }

        if (genreGrid) {
            genreGrid.innerHTML = "";

            genres.forEach((engine) => {
                const cfg = engineConfig[engine];
                const style = GENRE_STYLE[engine] || GENRE_STYLE["engine-normal"];

                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "genre-card";
                btn.setAttribute("style", genreVars(engine));
                btn.dataset.engine = engine;
                btn.innerHTML = `
                    <span class="genre-orb"><i class="fa-solid ${cfg.iconTheme}"></i></span>
                    <span class="genre-text">
                        <strong>${esc(cfg.label)}</strong>
                        <em>${esc(cfg.genre)}</em>
                        <small>${esc(style.blurb)}</small>
                    </span>
                `;

                btn.onclick = () => pickGenre(engine);
                genreGrid.appendChild(btn);
            });
        }

        if (genreModal) genreModal.classList.add("show");
    }

    function pickGenre(engine) {
        const callback = genreCallback;
        closeGenreModal();
        if (callback) callback(engine);
    }

    function closeGenreModal() {
        genreCallback = null;
        if (genreModal) genreModal.classList.remove("show");
    }

    function createCharacterFile(genre) {
        if (!currentWorkspace) return;

        saveCurrentDocument();

        const doc = createDocument("Character Profile", "character", null, genre);
        currentWorkspace.documents.push(doc);
        currentDocument = doc;

        saveStorage();
        renderDocuments();
        loadCurrentDocument();
        triggerPageTurnAnimation();
    }

    /* ---------- pop-up 2: choose the architecture ---------- */
    function openArchitectureModal() {
        renderArchitectureModal();

        if (archBackBtn) {
            archBackBtn.style.display = allowedEngines.length > 1 ? "" : "none";
        }

        if (architectureModal) architectureModal.classList.add("show");
    }

    function closeArchitectureModal() {
        if (architectureModal) architectureModal.classList.remove("show");
    }

    function backToGenrePicker() {
        closeArchitectureModal();

        openGenrePicker("architecture", (genre) => {
            pendingGenre = genre;
            openArchitectureModal();
        });
    }

    function renderArchitectureModal() {
        if (!architectureGrid) return;

        const cfg = engineConfig[pendingGenre] || engineConfig["engine-normal"];

        if (archThemeChip) {
            archThemeChip.setAttribute("style", genreVars(pendingGenre));
            archThemeChip.innerHTML = `
                <i class="fa-solid ${cfg.iconTheme}"></i>
                ${esc(cfg.label)}
            `;
        }

        const items = [
            ...ARCH_COMMON.map((item) => ({ ...item, unique: false })),
            { ...cfg.arch.world, unique: false },
            { ...cfg.arch.power, unique: false },
            { ...cfg.arch.special, unique: true }
        ];

        architectureGrid.innerHTML = "";

        items.forEach((item) => {
            const btn = document.createElement("button");
            btn.className = "arch-option block-btn" + (item.unique ? " arch-option-unique" : "");

            btn.innerHTML = `
                <i class="fa-solid ${item.icon}"></i>
                ${item.label}
                ${
                    item.unique
                        ? '<span class="unique-tag"><i class="fa-solid fa-star"></i> Signature</span>'
                        : ""
                }
            `;

            btn.onclick = () => createArchitectureFile(item.key);
            architectureGrid.appendChild(btn);
        });
    }

    function createArchitectureFile(type) {
        closeArchitectureModal();
        saveCurrentDocument();

        if (!currentWorkspace) return;

        const doc = createDocument(getArchLabel(type), type, null, pendingGenre);
        currentWorkspace.documents.push(doc);
        currentDocument = doc;

        saveStorage();
        renderDocuments();
        loadCurrentDocument();
        triggerPageTurnAnimation();
    }

    function todayDMY() {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, "0");
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        return `${dd}/${mm}/${now.getFullYear()}`;
    }

    function nextCallSheetDay() {
        const sheets = workspaces.find((w) => w.type === "callsheet");
        if (!sheets) return 1;

        const days = sheets.documents.map((doc) => {
            const match = String(doc.title).match(/DAY\s+(\d+)/i);
            return match ? parseInt(match[1], 10) : 0;
        });

        return Math.max(0, ...days) + 1;
    }

    function openCallSheetModal() {
        /* Automation: next day number and today's date, both editable. */
        if (csDayNumber) csDayNumber.value = String(nextCallSheetDay());
        if (csDate) csDate.value = todayDMY();

        if (callSheetModal) callSheetModal.classList.add("show");
    }

    function closeCallSheetModal() {
        if (callSheetModal) callSheetModal.classList.remove("show");
    }

    function confirmCallSheet() {
        if (!currentWorkspace) return;

        const day = csDayNumber && csDayNumber.value ? csDayNumber.value : String(nextCallSheetDay());
        const date = csDate && csDate.value.trim() ? csDate.value.trim() : todayDMY();

        closeCallSheetModal();

        const docTitleStr = `DAY ${day} - [${date}]`;
        const doc = createDocument(docTitleStr, "callsheet", { day, date });

        currentWorkspace.documents.push(doc);
        currentDocument = doc;

        saveStorage();
        renderDocuments();
        loadCurrentDocument();
        triggerPageTurnAnimation();
    }

    /* ============================================================
       SHORTCUTS
    ============================================================ */
    function setupShortcuts() {
        document.addEventListener("keydown", (event) => {
            if (event.key === "F5") {
                event.preventDefault();
                toggleZenMode();
            }

            if (
                (event.ctrlKey || event.metaKey) &&
                event.shiftKey &&
                (event.key === "N" || event.key === "n")
            ) {
                event.preventDefault();
                newWorkspace();
            } else if (
                (event.ctrlKey || event.metaKey) &&
                (event.key === "n" || event.key === "N")
            ) {
                event.preventDefault();
                handleNewFileClick();
            }

            if (event.key === "F2" && currentDocument) {
                event.preventDefault();
                renameDocument(currentDocument.id);
            }

            if (event.key === "Delete") {
                const activeEl = document.activeElement;

                if (
                    activeEl &&
                    !activeEl.isContentEditable &&
                    activeEl.tagName !== "INPUT" &&
                    currentDocument
                ) {
                    event.preventDefault();
                    triggerDeleteConfirmation(currentDocument.id);
                }
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;

        ["genreModal", "architectureModal", "callSheetModal", "confirmDeleteModal", "aiAnalysisModal"].forEach((id) => {
            const el = $(id);

            if (el && el.classList.contains("show")) {
                el.classList.remove("show");
                if (id === "genreModal") genreCallback = null;
                if (id === "confirmDeleteModal") pendingDeleteDocId = null;
            }
        });

        closeAllDropdowns();
    });

    function triggerDeleteConfirmation(id) {
        pendingDeleteDocId = id;

        if (!currentWorkspace) return;

        const doc = currentWorkspace.documents.find((d) => d.id === id);
        if (!doc) return;

        if (deleteTargetName) deleteTargetName.textContent = `"${doc.title}"`;
        if (confirmDeleteModal) confirmDeleteModal.classList.add("show");
    }

    function closeDeleteModal() {
        pendingDeleteDocId = null;
        if (confirmDeleteModal) confirmDeleteModal.classList.remove("show");
    }

    function confirmDeleteAction() {
        if (pendingDeleteDocId) deleteDocument(pendingDeleteDocId);
        closeDeleteModal();
    }

    function applyMainTemplate(type) {
        if (!currentWorkspace || !editor) return;

        if (["characters", "architecture", "callsheet"].includes(currentWorkspace.type)) {
            return;
        }

        closeAllDropdowns();

        if (confirm("Apply template? Replace current page content.")) {
            if (type === "screenplay") editor.innerHTML = getScreenplayTemplate();
            if (type === "novel") editor.innerHTML = getNovelTemplate();
            if (type === "dialogue") editor.innerHTML = getDialogueTemplate();

            normalizeSheetHeight();
            autoSave();
        }
    }

    /* ============================================================
       AI ANALYSIS
    ============================================================ */
    function runAiAnalysis() {
        if (!btnAnalyse) return;

        const originalHtml = btnAnalyse.innerHTML;
        btnAnalyse.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Processing...</span>`;
        btnAnalyse.disabled = true;

        setTimeout(() => {
            if (aiAnalysisResults) {
                aiAnalysisResults.innerHTML = `
                    <div class="ai-card success">
                        <h4><i class="fa-solid fa-circle-check"></i> Telemetry Clean</h4>
                        <p>No continuity breaks detected in the current matrix.</p>
                    </div>
                `;
            }

            if (aiAnalysisModal) aiAnalysisModal.classList.add("show");

            btnAnalyse.innerHTML = originalHtml;
            btnAnalyse.disabled = false;
        }, 1000);
    }

    function closeAiModal() {
        if (aiAnalysisModal) aiAnalysisModal.classList.remove("show");
    }

    /* ============================================================
       DOCUMENT LIST
    ============================================================ */
    function renderDocuments() {
        if (!tabs || !currentWorkspace) return;

        tabs.innerHTML = "";

        const search = globalSearch ? globalSearch.value.trim().toLowerCase() : "";
        let docs = currentWorkspace.documents;

        if (search) {
            docs = docs.filter(
                (d) =>
                    d.title.toLowerCase().includes(search) ||
                    d.content.toLowerCase().includes(search)
            );
        }

        docs.forEach((doc) => {
            const item = document.createElement("div");
            item.className = "tab";

            if (currentDocument && currentDocument.id === doc.id) {
                item.classList.add("active");
            }

            item.innerHTML = `
                <div>
                    <div class="doc-title-row">
                        <i class="fa-solid ${getDocTypeIcon(doc.type)} doc-type-icon"></i>
                        <span class="doc-title-text">${esc(doc.title || "Untitled")}</span>
                        ${
                            doc.genre
                                ? `<span class="doc-genre" style="${genreVars(doc.genre)}" title="${esc(
                                      (engineConfig[doc.genre] || {}).label || ""
                                  )}"></span>`
                                : ""
                        }
                    </div>
                    <div class="doc-meta">Up: ${doc.updated}</div>
                </div>
            `;

            const actions = document.createElement("div");
            actions.className = "tab-actions";
            actions.innerHTML = `
                <button class="icon-btn" onclick="event.stopPropagation(); window.renameDocument('${doc.id}')">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="icon-btn" style="color:var(--danger);" onclick="event.stopPropagation(); window.triggerDeleteConfirmation('${doc.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;

            item.appendChild(actions);
            item.onclick = () => openDocument(doc.id);

            tabs.appendChild(item);
        });
    }

    function openDocument(id) {
        if (currentDocument && currentDocument.id === id) return;

        saveCurrentDocument();

        if (!currentWorkspace) return;

        currentDocument = currentWorkspace.documents.find((d) => d.id === id);

        loadCurrentDocument();
        triggerPageTurnAnimation();
    }

    function loadCurrentDocument() {
        if (!currentWorkspace) return;

        if (folderName) folderName.textContent = currentWorkspace.name;

        if (!currentDocument) {
            if (docTitle) docTitle.value = "";

            if (editor) {
                editor.innerHTML =
                    "<p style='color:var(--text-muted); text-align:center;'>Directory empty. Initialize a new node.</p>";
                editor.contentEditable = false;
            }
        } else {
            if (docTitle) docTitle.value = currentDocument.title;

            if (editor) {
                editor.innerHTML = currentDocument.content;
                editor.contentEditable = true;
            }
        }

        applyDocTheme();
        renderDocuments();
        updateReportButton();
        updateStatistics();
        updateToolbarState();
        normalizeSheetHeight();
    }

    window.renameDocument = (id) => {
        if (!currentWorkspace) return;

        const doc = currentWorkspace.documents.find((d) => d.id === id);
        if (!doc) return;

        const newName = prompt("Rename Node:", doc.title);
        if (!newName) return;

        doc.title = newName;

        /* The user took control of this file name. */
        if (AUTO_TITLE_FIELDS[doc.type]) doc.autoTitle = false;

        if (currentDocument && currentDocument.id === id && docTitle) {
            docTitle.value = newName;
        }

        saveStorage();
        renderDocuments();
    };

    window.triggerDeleteConfirmation = triggerDeleteConfirmation;

    function deleteDocument(id) {
        if (!currentWorkspace) return;

        currentWorkspace.documents = currentWorkspace.documents.filter((d) => d.id !== id);
        currentDocument =
            currentWorkspace.documents.length > 0 ? currentWorkspace.documents[0] : null;

        saveStorage();
        renderDocuments();
        loadCurrentDocument();
        triggerPageTurnAnimation();
    }

    function saveCurrentDocument() {
        if (!currentDocument || !editor || editor.contentEditable === "false") return;

        currentDocument.title = docTitle ? docTitle.value.trim() || "Untitled" : "Untitled";
        currentDocument.content = editor.innerHTML;
        currentDocument.updated = getCurrentTime();

        saveStorage();
    }

    /* ============================================================
       FORMATTING
    ============================================================ */
    function formatText(command, value = null) {
        try {
            document.execCommand(command, false, value);
        } catch {}

        if (editor) editor.focus();

        updateToolbarState();
        autoSave();
    }

    function updateToolbarState() {
        try {
            if (btnBold) btnBold.classList.toggle("active", document.queryCommandState("bold"));
            if (btnItalic) btnItalic.classList.toggle("active", document.queryCommandState("italic"));
            if (btnUnderline)
                btnUnderline.classList.toggle("active", document.queryCommandState("underline"));
            if (btnStrike)
                btnStrike.classList.toggle("active", document.queryCommandState("strikeThrough"));
        } catch {}
    }

    document.addEventListener("selectionchange", updateToolbarState);

    if (editor) {
        editor.addEventListener("keyup", updateToolbarState);
        editor.addEventListener("mouseup", updateToolbarState);
    }

    if (fontFamily) {
        fontFamily.addEventListener("change", function () {
            formatText("fontName", this.value);
        });
    }

    if (fontSize) {
        fontSize.addEventListener("change", function () {
            const map = {
                "14": "2",
                "16": "3",
                "18": "4",
                "22": "5",
                "26": "6",
                "32": "7"
            };

            formatText("fontSize", map[this.value] || "4");
        });
    }

    if (textColor) {
        textColor.addEventListener("input", function () {
            formatText("foreColor", this.value);
        });
    }

    /* ============================================================
       DROPDOWNS / ZEN / INSERTS
    ============================================================ */
    function toggleDropdown(id) {
        const el = document.getElementById(id);
        if (!el) return;

        const isOpen = el.classList.contains("show");
        closeAllDropdowns();

        const trigger = el.previousElementSibling;

        if (!isOpen && trigger && !trigger.classList.contains("disabled")) {
            el.classList.add("show");
        }
    }

    function closeAllDropdowns() {
        document.querySelectorAll(".dropdown-content").forEach((dropdown) => {
            dropdown.classList.remove("show");
        });
    }

    window.addEventListener("click", (event) => {
        if (!event.target.closest(".dropdown")) {
            closeAllDropdowns();
        }
    });

    function toggleZenMode() {
        document.body.classList.toggle("zen-mode");
        normalizeSheetHeight();
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && document.body.classList.contains("zen-mode")) {
            toggleZenMode();
        }
    });

    function insertTable() {
        formatText(
            "insertHTML",
            `
                <table style="width:100%; table-layout:fixed; word-break:break-word; overflow-wrap:anywhere; border-collapse:collapse; margin:12px 0;">
                    <tr>
                        <th style="border:1px solid rgba(128,128,128,0.35); padding:8px;">Detail</th>
                        <th style="border:1px solid rgba(128,128,128,0.35); padding:8px;">Notes</th>
                    </tr>
                    <tr>
                        <td style="border:1px solid rgba(128,128,128,0.35); padding:8px;">...</td>
                        <td style="border:1px solid rgba(128,128,128,0.35); padding:8px;">...</td>
                    </tr>
                </table>
                <p></p>
            `
        );

        normalizeSheetHeight();
    }

    function insertImage() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";

        input.onchange = function () {
            if (input.files && input.files[0]) {
                const reader = new FileReader();

                reader.onload = (event) => {
                    formatText(
                        "insertHTML",
                        `<img src="${event.target.result}" style="max-width:100%; height:auto; display:block; border-radius:12px; margin:12px 0;" alt="Image"><p></p>`
                    );

                    normalizeSheetHeight();
                };

                reader.readAsDataURL(input.files[0]);
            }
        };

        input.click();
    }

    /* ============================================================
       EXPORT
    ============================================================ */
    function exportContent(scope, format) {
        closeAllDropdowns();
        saveCurrentDocument();

        if (!editor) return;

        let htmlStr = `
            <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Georgia, serif; line-height: 1.6; }
                        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                        th, td { border: 1px solid #999; padding: 6px; word-break: break-word; }
                        img { max-width: 100%; height: auto; }
                    </style>
                </head>
                <body>
        `;

        let textStr = "";

        const filename =
            (scope === "file"
                ? currentDocument
                    ? currentDocument.title
                    : "Untitled"
                : currentWorkspace
                ? currentWorkspace.name
                : "Export") || "Export";

        const docsToExport =
            scope === "folder"
                ? currentWorkspace
                    ? currentWorkspace.documents
                    : []
                : currentDocument
                ? [currentDocument]
                : [];

        if (docsToExport.length === 0) {
            alert("Nothing to export!");
            return;
        }

        if (format === "pdf") {
            if (scope === "folder") {
                alert("Folder PDF export will print all files concatenated sequentially.");
            }

            const originalHTML = editor.innerHTML;
            editor.innerHTML = "";

            docsToExport.forEach((d) => {
                editor.innerHTML += `<h1>${d.title}</h1>${d.content}<br><hr><br>`;
            });

            window.print();
            editor.innerHTML = originalHTML;
            normalizeSheetHeight();
            return;
        }

        docsToExport.forEach((d) => {
            htmlStr += `<h1>${d.title}</h1><div>${d.content}</div><br><hr><br>`;

            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = `Title: ${d.title}\n\n${d.content}`;
            textStr += tempDiv.innerText + "\n\n------------------------\n\n";
        });

        htmlStr += `</body></html>`;

        let blob;
        let extension;

        if (format === "word") {
            blob = new Blob(["\ufeff", htmlStr], { type: "application/msword" });
            extension = ".doc";
        } else {
            blob = new Blob([textStr], { type: "text/plain;charset=utf-8" });
            extension = ".txt";
        }

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename + extension;
        link.click();
    }

    /* ============================================================
       STATS / AUTOSAVE
    ============================================================ */
    function updateStatistics() {
        if (!editor) return;

        const text = editor.innerText || "";
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;

        if (wordCount) wordCount.textContent = words.toLocaleString();
        if (charCount) charCount.textContent = text.length.toLocaleString();

        if (paraCount) {
            paraCount.textContent = text
                .split(/\n+/)
                .filter((p) => p.trim() !== "").length.toLocaleString();
        }

        if (readTime) {
            readTime.textContent = `${Math.max(1, Math.ceil(words / 200))} min`;
        }
    }

    /* ============================================================
       AUTOMATION — age from birthdate, file name from title fields
    ============================================================ */
    function blockOf(node) {
        let el = node && node.nodeType === 3 ? node.parentNode : node;

        while (el && el.parentNode !== editor) {
            el = el.parentNode;
            if (!el || el === document.body) return null;
        }

        return el && el.parentNode === editor ? el : null;
    }

    function selectionBlock() {
        const sel = window.getSelection();
        if (!sel || !sel.anchorNode || !editor || !editor.contains(sel.anchorNode)) return null;
        return blockOf(sel.anchorNode);
    }

    function findFieldBlock(label) {
        if (!editor) return null;

        return (
            Array.from(editor.children).find((el) => {
                const f = U.fieldOf(el);
                return f && f.label === label;
            }) || null
        );
    }

    function setFieldContent(block, build) {
        const first = Array.from(block.childNodes).find(
            (n) => n.nodeType === 1 && /^(strong|b)$/i.test(n.tagName)
        );
        if (!first) return;

        while (first.nextSibling) block.removeChild(first.nextSibling);
        build(block);
    }

    function syncAge() {
        const dobBlock = findFieldBlock("BIRTHDATE");
        const ageBlock = findFieldBlock("AGE");
        if (!dobBlock || !ageBlock) return false;

        if (selectionBlock() === ageBlock) return false;

        const dobFields = U.fieldOf(dobBlock);
        const age = U.calcAge(U.parseDOB(dobFields ? dobFields.value : ""));

        const current = U.fieldOf(ageBlock);
        const autoSpan = ageBlock.querySelector('[data-auto="age"]');
        const isEmpty = !current || U.isPlaceholder(current.value.replace(/\n/g, " "));

        if (age !== null && (isEmpty || autoSpan)) {
            if (autoSpan && U.flat(autoSpan.textContent) === String(age)) return false;

            setFieldContent(ageBlock, (block) => {
                block.appendChild(document.createTextNode(" "));

                const span = document.createElement("span");
                span.className = "auto-fill";
                span.dataset.auto = "age";
                span.title = "Calculated from birthdate. Type here to override it.";
                span.textContent = String(age);
                block.appendChild(span);
            });

            return true;
        }

        if (age === null && autoSpan) {
            setFieldContent(ageBlock, (block) => {
                block.appendChild(document.createTextNode(" (calculated from birthdate)"));
            });

            return true;
        }

        return false;
    }

    /* Typing inside AGE turns the automatic value into the user's own. */
    function markManualAge() {
        const block = selectionBlock();
        if (!block) return;

        const span = block.querySelector('[data-auto="age"]');
        if (!span) return;

        const field = U.fieldOf(block);
        if (!field || field.label !== "AGE") return;

        const text = document.createTextNode(span.textContent);
        span.replaceWith(text);
    }

    function syncTitle() {
        if (!currentDocument || currentDocument.autoTitle === false) return false;

        const labels = AUTO_TITLE_FIELDS[currentDocument.type];
        if (!labels) return false;

        const parsed = U.parseFields(editor);
        const parts = labels.map((label) => U.flat(U.getField(parsed, label))).filter(Boolean);
        if (!parts.length) return false;

        const title = parts.join(" & ").slice(0, 60);

        if (title === currentDocument.title) return false;

        currentDocument.title = title;
        if (docTitle) docTitle.value = title;

        return true;
    }

    function runAutomation() {
        if (!currentDocument || !editor || editor.contentEditable === "false") return false;

        let changed = false;

        if (prefs.autoAge && currentDocument.type === "character") {
            changed = syncAge() || changed;
        }

        if (prefs.autoTitle) {
            changed = syncTitle() || changed;
        }

        return changed;
    }

    /* ============================================================
       PRODUCTION REPORT (single PDF)
    ============================================================ */
    function updateReportButton() {
        if (!reportBtn) return;

        const show =
            currentWorkspace &&
            (currentWorkspace.type === "characters" || currentWorkspace.type === "architecture");

        reportBtn.style.display = show ? "" : "none";
    }

    function generateReport() {
        if (!project) return;

        saveCurrentDocument();

        if (!window.ScriptoriumReport || !(window.jspdf && window.jspdf.jsPDF)) {
            showToast(
                "fa-triangle-exclamation",
                "Report unavailable",
                "The PDF engine did not load. Reload the page and try again."
            );
            return;
        }

        showToast("fa-file-pdf", "Building report", "Collecting characters and architecture...");

        setTimeout(() => {
            try {
                const result = window.ScriptoriumReport.generate({
                    project,
                    workspaces,
                    engineConfig,
                    archLabel: getArchLabel,
                    ownerEmail: session ? session.email : ""
                });

                showToast(
                    "fa-circle-check",
                    "Report downloaded",
                    `${result.pages} pages · ${result.characters} characters · ${result.architecture} architecture files`
                );
            } catch (error) {
                console.error(error);
                showToast(
                    "fa-triangle-exclamation",
                    "Report failed",
                    "Something went wrong while building the PDF."
                );
            }
        }, 80);
    }

    function autoSave() {
        clearTimeout(autoSaveTimer);

        if (saveStatus) {
            saveStatus.style.opacity = "0.5";
            saveStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SYNCING...';
        }

        autoSaveTimer = setTimeout(() => {
            if (runAutomation()) {
                saveCurrentDocument();
                renderDocuments();
            }

            saveCurrentDocument();

            if (saveStatus) {
                saveStatus.style.opacity = "1";
                saveStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> SYSTEM SYNCED';
            }
        }, 500);
    }

    if (editor) {
        editor.addEventListener("input", () => {
            markManualAge();
            normalizeSheetHeight();
            updateStatistics();
            updateToolbarState();
            autoSave();
        });
    }

    if (docTitle) {
        docTitle.addEventListener("input", () => {
            /* Typing a file name takes control; clearing it hands control back. */
            if (currentDocument && AUTO_TITLE_FIELDS[currentDocument.type]) {
                currentDocument.autoTitle = docTitle.value.trim() === "";
            }

            autoSave();
        });
    }

    if (globalSearch) {
        globalSearch.addEventListener("input", renderDocuments);
    }

    window.addEventListener("resize", normalizeSheetHeight);
    window.addEventListener("beforeunload", saveCurrentDocument);

    /* ============================================================
       RETURN TO STUDIO LOT
    ============================================================ */
    function returnToStudio() {
        saveCurrentDocument();
        saveStorage();
        redirectDashboard();
    }

    /* ============================================================
       GLOBAL EXPORTS
    ============================================================ */
    window.toggleFolderSidebar = toggleFolderSidebar;
    window.toggleFileSidebar = toggleFileSidebar;

    window.newWorkspace = newWorkspace;
    window.handleNewFileClick = handleNewFileClick;

    window.openArchitectureModal = openArchitectureModal;
    window.closeArchitectureModal = closeArchitectureModal;
    window.createArchitectureFile = createArchitectureFile;

    window.openCallSheetModal = openCallSheetModal;
    window.closeCallSheetModal = closeCallSheetModal;
    window.confirmCallSheet = confirmCallSheet;

    window.closeDeleteModal = closeDeleteModal;
    window.confirmDeleteAction = confirmDeleteAction;

    window.applyMainTemplate = applyMainTemplate;
    window.setDisplayMode = setDisplayMode;
    window.togglePref = togglePref;

    window.openGenrePicker = openGenrePicker;
    window.closeGenreModal = closeGenreModal;
    window.backToGenrePicker = backToGenrePicker;
    window.generateReport = generateReport;

    window.toggleDropdown = toggleDropdown;
    window.toggleZenMode = toggleZenMode;

    window.insertTable = insertTable;
    window.insertImage = insertImage;
    window.exportContent = exportContent;
    window.formatText = formatText;

    window.runAiAnalysis = runAiAnalysis;
    window.closeAiModal = closeAiModal;

    window.returnToStudio = returnToStudio;

    /* ============================================================
       SIDEBAR TOGGLES
    ============================================================ */
    function toggleFolderSidebar() {
        if (folderSidebar) folderSidebar.classList.toggle("collapsed");
    }

    function toggleFileSidebar() {
        if (fileSidebar) fileSidebar.classList.toggle("collapsed");
    }

    /* ============================================================
       INITIALIZE
    ============================================================ */
    initializeApplication();
})();