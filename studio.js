/* ============================================================
SCRIPTORIUM NEXUS V13 — STUDIO LOT
Handles:
- Session validation (Writer clearance only)
- Project dashboard rendering
- Create / Rename / Delete / Open projects
- Engine selection for each project (8 Engine Protocols)
- Identity verification badge
- Logout
============================================================ */
(() => {
    "use strict";

    const SESSION_KEY = "scriptorium_session_v13";
    const PROJECTS_KEY = "scriptorium_projects_v13";
    const ACTIVE_PROJECT_KEY = "scriptorium_active_project_v13";

    const ENGINE_LABELS = {
        "engine-normal": "Normal",
        "engine-drama": "Drama",
        "engine-fantasy": "Fantasy",
        "engine-horror": "Horror",
        "engine-scifi": "Sci-Fi",
        "engine-superhero": "Superhero",
        "engine-romance": "Romance",
        "engine-mystery": "Mystery"
    };

    const ROLE_ICONS = {
        director: "fa-user-shield",
        writer: "fa-pen-nib",
        actor: "fa-masks-theater"
    };

    function $(id) {
        return document.getElementById(id);
    }

    const sessionUser = $("sessionUser");
    const logoutBtn = $("logoutBtn");

    const newProjectBtn = $("newProjectBtn");
    const projectGrid = $("projectGrid");

    const newProjectModal = $("newProjectModal");
    const closeNewProjectBtn = $("closeNewProjectBtn");
    const cancelProjectBtn = $("cancelProjectBtn");
    const createProjectBtn = $("createProjectBtn");
    const projectTitle = $("projectTitle");
    const engineNote = $("engineNote");

    const confirmDeleteModal = $("confirmDeleteModal");
    const closeDeleteModalBtn = $("closeDeleteModalBtn");
    const cancelDeleteBtn = $("cancelDeleteBtn");
    const confirmDeleteBtn = $("confirmDeleteBtn");
    const deleteProjectName = $("deleteProjectName");

    const renameProjectModal = $("renameProjectModal");
    const closeRenameModalBtn = $("closeRenameModalBtn");
    const cancelRenameBtn = $("cancelRenameBtn");
    const confirmRenameBtn = $("confirmRenameBtn");
    const renameProjectInput = $("renameProjectInput");

    let pendingDeleteId = null;
    let pendingRenameId = null;

    /* ============================================================
       UTILITIES
    ============================================================ */
    function generateID() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function getCurrentTime() {
        return new Date().toISOString();
    }

    function escapeHtml(value) {
        return String(value || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatTime(iso) {
        try {
            return new Date(iso).toLocaleString([], {
                dateStyle: "short",
                timeStyle: "short"
            });
        } catch {
            return "";
        }
    }

    /* ============================================================
       STORAGE
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

    function saveProjects(projects) {
        try {
            localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
        } catch {}
    }

    /* ============================================================
       SESSION / ACCESS
    ============================================================ */
    function redirectLogin() {
        window.location.href = "index.html";
    }

    function logout() {
        try {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(ACTIVE_PROJECT_KEY);
        } catch {}

        window.location.href = "index.html?logout=1";
    }

    /* ============================================================
       ENGINE SELECTION
    ============================================================ */
    function getCheckedEngines() {
        return Array.from(document.querySelectorAll(".engine-check:checked")).map(
            (input) => input.value
        );
    }

    function updateEngineNote() {
        const checked = getCheckedEngines();

        document.querySelectorAll(".engine-card").forEach((card) => {
            const input = card.querySelector("input");
            card.classList.toggle("selected", Boolean(input && input.checked));
        });

        if (!engineNote) return;

        if (checked.length === 0) {
            engineNote.textContent =
                "Select at least one engine. One engine locks the project. Multiple engines allow switching.";
        } else if (checked.length === 1) {
            engineNote.textContent =
                "Single engine selected. The Soundstage will be locked to this engine.";
        } else {
            engineNote.textContent =
                checked.length +
                " engines selected. Engine Protocol switching will be active inside the project.";
        }
    }

    /* ============================================================
       MODALS
    ============================================================ */
    function openNewProjectModal() {
        if (!newProjectModal) return;

        if (projectTitle) {
            projectTitle.value = "";
        }

        document.querySelectorAll(".engine-check").forEach((input) => {
            input.checked = false;
        });

        updateEngineNote();
        newProjectModal.classList.add("show");

        if (projectTitle) {
            projectTitle.focus();
        }
    }

    function closeNewProjectModal() {
        if (newProjectModal) {
            newProjectModal.classList.remove("show");
        }
    }

    function openDeleteModal(projectId) {
        const projects = getProjects();
        const project = projects.find((p) => p.id === projectId);

        if (!project) return;

        pendingDeleteId = projectId;

        if (deleteProjectName) {
            deleteProjectName.textContent = `"${project.title}"`;
        }

        if (confirmDeleteModal) {
            confirmDeleteModal.classList.add("show");
        }
    }

    function closeDeleteModal() {
        pendingDeleteId = null;

        if (confirmDeleteModal) {
            confirmDeleteModal.classList.remove("show");
        }
    }

    function openRenameModal(projectId) {
        const projects = getProjects();
        const project = projects.find((p) => p.id === projectId);

        if (!project) return;

        pendingRenameId = projectId;

        if (renameProjectInput) {
            renameProjectInput.value = project.title;
        }

        if (renameProjectModal) {
            renameProjectModal.classList.add("show");
            renameProjectInput.focus();
        }
    }

    function closeRenameModal() {
        pendingRenameId = null;

        if (renameProjectModal) {
            renameProjectModal.classList.remove("show");
        }
    }

    /* ============================================================
       PROJECT ACTIONS
    ============================================================ */
    function createProject() {
        const session = getSession();

        if (!session) {
            redirectLogin();
            return;
        }

        const title = projectTitle && projectTitle.value.trim()
            ? projectTitle.value.trim()
            : "Untitled Production";

        const engines = getCheckedEngines();

        if (engines.length === 0) {
            if (engineNote) {
                engineNote.textContent =
                    "Protocol violation. Select at least one engine before creating a production.";
            }
            return;
        }

        const projects = getProjects();

        projects.unshift({
            id: generateID(),
            title,
            engines,
            activeEngine: engines[0],
            owner: session.email,
            role: session.role || "writer",
            createdAt: getCurrentTime(),
            updatedAt: getCurrentTime(),
            workspaces: []
        });

        saveProjects(projects);
        closeNewProjectModal();
        renderProjects();
    }

    function openProject(projectId) {
        try {
            localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
        } catch {}

        window.location.href = "editor.html";
    }

    function confirmDelete() {
        if (!pendingDeleteId) return;

        let projects = getProjects();
        projects = projects.filter((p) => p.id !== pendingDeleteId);

        saveProjects(projects);
        closeDeleteModal();
        renderProjects();
    }

    function confirmRename() {
        if (!pendingRenameId || !renameProjectInput) return;

        const projects = getProjects();
        const project = projects.find((p) => p.id === pendingRenameId);

        if (!project) return;

        const newTitle = renameProjectInput.value.trim();

        if (!newTitle) {
            renameProjectInput.focus();
            return;
        }

        project.title = newTitle;
        project.updatedAt = getCurrentTime();

        saveProjects(projects);
        closeRenameModal();
        renderProjects();
    }

    /* ============================================================
       RENDER PROJECT GRID
    ============================================================ */
    function renderProjects() {
        if (!projectGrid) return;

        const projects = getProjects();
        projectGrid.innerHTML = "";

        if (projects.length === 0) {
            projectGrid.innerHTML = `
                <div class="project-empty">
                    <i class="fa-solid fa-film"></i>
                    <p>No productions exist on this Studio Lot.</p>
                    <p>Create a project to open your first Scriptorium Soundstage.</p>
                </div>
            `;
            return;
        }

        projects.forEach((project) => {
            const card = document.createElement("div");
            card.className = "project-card";

            const posterClass =
                project.engines.length > 1
                    ? "multi"
                    : (project.engines[0] || "engine-normal").replace("engine-", "");

            const chips = (project.engines || [])
                .map((engine) => {
                    const shortClass = engine.replace("engine-", "");
                    const label = ENGINE_LABELS[engine] || engine;

                    return `<span class="engine-chip chip-${shortClass}">${escapeHtml(label)}</span>`;
                })
                .join("");

            card.innerHTML = `
                <div class="project-poster ${escapeHtml(posterClass)}">
                    <i class="fa-solid fa-film"></i>
                </div>

                <h3 class="project-title">${escapeHtml(project.title)}</h3>

                <div class="project-meta">
                    <span>Updated: ${escapeHtml(formatTime(project.updatedAt))}</span>
                </div>

                <div class="project-engine-chips">
                    ${chips}
                </div>

                <div class="project-actions">
                    <button class="project-btn view" type="button">
                        <i class="fa-solid fa-eye"></i> View
                    </button>

                    <button class="project-btn rename" type="button">
                        <i class="fa-solid fa-pen"></i> Rename
                    </button>

                    <button class="project-btn delete" type="button">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            `;

            card.querySelector(".view").addEventListener("click", () => {
                openProject(project.id);
            });

            card.querySelector(".rename").addEventListener("click", () => {
                openRenameModal(project.id);
            });

            card.querySelector(".delete").addEventListener("click", () => {
                openDeleteModal(project.id);
            });

            projectGrid.appendChild(card);
        });
    }

    /* ============================================================
       BIND EVENTS
    ============================================================ */
    function bindEvents() {
        if (logoutBtn) {
            logoutBtn.addEventListener("click", logout);
        }

        if (newProjectBtn) {
            newProjectBtn.addEventListener("click", openNewProjectModal);
        }

        if (closeNewProjectBtn) {
            closeNewProjectBtn.addEventListener("click", closeNewProjectModal);
        }

        if (cancelProjectBtn) {
            cancelProjectBtn.addEventListener("click", closeNewProjectModal);
        }

        if (createProjectBtn) {
            createProjectBtn.addEventListener("click", createProject);
        }

        document.querySelectorAll(".engine-check").forEach((input) => {
            input.addEventListener("change", updateEngineNote);
        });

        if (closeDeleteModalBtn) {
            closeDeleteModalBtn.addEventListener("click", closeDeleteModal);
        }

        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener("click", closeDeleteModal);
        }

        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener("click", confirmDelete);
        }

        if (closeRenameModalBtn) {
            closeRenameModalBtn.addEventListener("click", closeRenameModal);
        }

        if (cancelRenameBtn) {
            cancelRenameBtn.addEventListener("click", closeRenameModal);
        }

        if (confirmRenameBtn) {
            confirmRenameBtn.addEventListener("click", confirmRename);
        }

        window.addEventListener("click", (event) => {
            if (newProjectModal && event.target === newProjectModal) {
                closeNewProjectModal();
            }

            if (confirmDeleteModal && event.target === confirmDeleteModal) {
                closeDeleteModal();
            }

            if (renameProjectModal && event.target === renameProjectModal) {
                closeRenameModal();
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeNewProjectModal();
                closeDeleteModal();
                closeRenameModal();
            }
        });
    }

    /* ============================================================
       INITIALIZE
    ============================================================ */
    function initialize() {
        const session = getSession();

        if (!session || session.role !== "writer") {
            redirectLogin();
            return;
        }

        if (sessionUser) {
            const roleIcon = ROLE_ICONS[session.role] || "fa-pen-nib";
            const verification = session.verification || "UNVERIFIED";
            const verifyClass = verification === "UNVERIFIED" ? "unverified" : "verified";

            sessionUser.innerHTML = `
                <i class="fa-solid ${roleIcon}"></i>
                <span>${escapeHtml(session.email)}</span>
                <span class="verify-badge ${verifyClass}" title="Identity clearance status">
                    <i class="fa-solid fa-shield-halved"></i>${escapeHtml(verification)}
                </span>
            `;
        }

        bindEvents();
        renderProjects();
        updateEngineNote();
    }

    initialize();
})();