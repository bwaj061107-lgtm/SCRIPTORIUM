/* ============================================================
SCRIPTORIUM NEXUS V13 — GATEWAY LORE TERMINAL
Types the system manual / boot sequence into #loreTerminal.
============================================================ */
(() => {
    "use strict";

    const terminal = document.getElementById("loreTerminal");

    if (!terminal) {
        return;
    }

    const lines = [
        "SCRIPTORIUM NEXUS V13 // ACCESS TERMINAL",
        "Initializing narrative containment fields...",
        "Loading Engine Protocols — 8 registered:",
        "> NORMAL — Modern, neutral studio interface.",
        "> DRAMA — Grounded prestige pressure. Smoke, ledgers, consequence.",
        "> FANTASY — Ancient realms, bloodlines, and old law.",
        "> HORROR — Paranormal instability. Flicker logic. Hostile silence.",
        "> SCI-FI — Deep-space telemetry. Cold physics. Survival protocol.",
        "> SUPERHERO — Multiverse-scale power and collateral consequence.",
        "> ROMANCE — Entangled hearts. Slow-burn tension. Every glance weighed.",
        "> MYSTERY — Cold cases. Hidden motives. The discipline of the clue.",
        "Loading Clearance Roles — 3 registered:",
        "> DIRECTOR — Full production authority. Reserved, not yet active.",
        "> WRITER — Studio Lot and Soundstage access. Active now.",
        "> ACTOR — Read-only performance access. Reserved, not yet active.",
        "Studio ID protocol is role-specific:",
        "> Writer  : name_secondname.initial@s.writer.com",
        "> Director: name_secondname.initial@s.director.com",
        "> Actor   : name_secondname.initial@s.actor.com",
        "Identity safeguard online: reserved-name registry engaged.",
        "New accounts are flagged UNVERIFIED until studio review.",
        "Scroll this terminal and the manual below for full detail.",
        "Awaiting clearance..."
    ];

    const reducedMotion =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
        terminal.textContent = lines.join("\n");
        return;
    }

    terminal.textContent = "";

    let lineIndex = 0;

    function typeNextLine() {
        if (lineIndex >= lines.length) {
            return;
        }

        const line = lines[lineIndex];
        let charIndex = 0;

        const interval = setInterval(() => {
            terminal.textContent += line.charAt(charIndex);
            charIndex += 1;

            terminal.scrollTop = terminal.scrollHeight;

            if (charIndex >= line.length) {
                clearInterval(interval);
                terminal.textContent += "\n";
                lineIndex += 1;

                setTimeout(typeNextLine, 180);
            }
        }, 10);
    }

    typeNextLine();
})();
