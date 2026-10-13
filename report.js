/* ============================================================
SCRIPTORIUM NEXUS V14 — PRODUCTION REPORT (PDF)
Builds ONE PDF for a production containing:
- Cover + contents + review checks
- Character summary + character profiles
- Family tree(s)
- Character connection map + connection list
- Architecture documents
Runs fully in the browser with the bundled jsPDF library.
============================================================ */
(() => {
    "use strict";

    const U = window.StoryUtils;

    const PAGE = { w: 210, h: 297, mx: 16, top: 20, bottom: 20 };
    const CW = PAGE.w - PAGE.mx * 2;
    const PT = 0.3528;

    const C = {
        ink: [43, 32, 22],
        muted: [122, 106, 84],
        accent: [168, 116, 42],
        dark: [33, 25, 17],
        rule: [221, 207, 180],
        soft: [247, 240, 222],
        family: [168, 116, 42],
        romantic: [190, 84, 110],
        ally: [58, 140, 98],
        enemy: [176, 58, 46],
        mentor: [62, 110, 160],
        other: [120, 120, 130],
        warn: [178, 110, 20]
    };

    const GENRE_COLORS = {
        "engine-normal": [168, 116, 42],
        "engine-drama": [124, 106, 43],
        "engine-fantasy": [154, 106, 18],
        "engine-horror": [138, 48, 48],
        "engine-scifi": [47, 111, 159],
        "engine-superhero": [192, 57, 43],
        "engine-romance": [184, 84, 110],
        "engine-mystery": [138, 109, 47]
    };

    const FACT_LABELS = [
        "ALIAS", "AGE", "BIRTHDATE", "GENDER", "SPECIES", "HEIGHT", "WEIGHT",
        "OCCUPATION", "STATUS", "ROLE", "ARCHETYPE"
    ];

    const CAT_LABELS = {
        family: "Family",
        romantic: "Romantic",
        ally: "Friend / Ally",
        enemy: "Enemy / Rival",
        mentor: "Mentor / Boss",
        other: "Other"
    };

    /* ---------- text safety (standard PDF fonts are Latin-only) ---------- */
    function S(value) {
        let s = String(value == null ? "" : value);
        const hadText = s.trim().length > 0;

        s = s
            .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
            .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
            .replace(/[\u2013\u2014\u2212]/g, "-")
            .replace(/\u2026/g, "...")
            .replace(/[\u2022\u25CF\u25AA]/g, "-")
            .replace(/[\u00A0\u2007\u202F]/g, " ")
            .replace(/[\u200B-\u200F\uFE00-\uFE0F\u2060]/g, "")
            .replace(/[^\n\x20-\x7E\u00A1-\u00FF]/g, "")
            .replace(/[ \t]+/g, " ");

        if (!s.trim() && hadText) return "[non-Latin text]";
        return s;
    }

    function mix(color, amount) {
        return color.map((c) => Math.round(c + (255 - c) * amount));
    }

    function slug(value) {
        return (
            String(value || "production")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "")
                .slice(0, 40) || "production"
        );
    }

    function todayLabel() {
        return new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    }

    /* ============================================================
       DATA COLLECTION
    ============================================================ */
    function collect(opts) {
        const { workspaces, engineConfig, archLabel } = opts;

        const archKeys = new Set(["timeline", "relationship", "twist"]);
        Object.keys(engineConfig || {}).forEach((engine) => {
            const arch = engineConfig[engine].arch || {};
            Object.keys(arch).forEach((slot) => archKeys.add(arch[slot].key));
        });

        const chars = [];
        const arch = [];

        (workspaces || []).forEach((ws) => {
            (ws.documents || []).forEach((doc) => {
                if (doc.type === "character") {
                    chars.push(makeCharacter(doc, engineConfig));
                } else if (archKeys.has(doc.type)) {
                    arch.push(makeArch(doc, engineConfig, archLabel));
                }
            });
        });

        return { chars, arch };
    }

    function genreLabel(genre, engineConfig) {
        const cfg = engineConfig && engineConfig[genre];
        return cfg ? cfg.label : "Normal";
    }

    function makeCharacter(doc, engineConfig) {
        const fields = U.parseFields(doc.content || "");
        const relations = [];
        const facts = {};
        const narrative = [];

        fields.forEach((f) => {
            const inRelations = /RELATION|CONNECTION|FAMILY/i.test(f.section);

            if (inRelations) {
                relations.push({
                    label: U.titleCase(f.label),
                    cls: U.classifyRelation(f.label),
                    names: U.splitNames(f.value),
                    raw: f.value
                });
            } else if (FACT_LABELS.includes(f.label)) {
                facts[f.label] = f.value;
            } else if (f.label !== "NAME") {
                narrative.push(f);
            }
        });

        const name = U.getField(fields, "NAME") || doc.title || "Unnamed Character";
        const aliasText = U.getField(fields, "ALIAS");
        const dobText = U.getField(fields, "BIRTHDATE");
        const dob = U.parseDOB(dobText);
        const age = facts.AGE || (dob ? String(U.calcAge(dob) ?? "") : "");

        const scorable = fields.filter(
            (f) => !/RELATION|CONNECTION|FAMILY/i.test(f.section) && f.label !== "NAME"
        );
        const filled = scorable.filter((f) => !f.empty).length;
        const pct = scorable.length ? Math.round((filled / scorable.length) * 100) : 0;

        return {
            doc,
            name: U.flat(name),
            aliases: U.splitNames(aliasText).map((n) => n.name),
            genre: doc.genre || "engine-normal",
            genreLabel: genreLabel(doc.genre || "engine-normal", engineConfig),
            fields,
            facts,
            narrative,
            relations,
            dobText,
            dob,
            age,
            pct,
            hasName: Boolean(U.getField(fields, "NAME")),
            node: null
        };
    }

    function makeArch(doc, engineConfig, archLabel) {
        const fields = U.parseFields(doc.content || "");
        const filled = fields.filter((f) => !f.empty);

        return {
            doc,
            title: doc.title || "Untitled",
            typeLabel: archLabel ? archLabel(doc.type) : "Architecture Document",
            genre: doc.genre || "engine-normal",
            genreLabel: genreLabel(doc.genre || "engine-normal", engineConfig),
            fields,
            filledCount: filled.length,
            total: fields.length
        };
    }

    /* ============================================================
       GRAPH + ANALYSIS
    ============================================================ */
    function buildGraph(chars) {
        const nodes = [];
        const byKey = new Map();
        const aliasMap = new Map();
        const firstNames = new Map();

        chars.forEach((c) => {
            const node = {
                id: nodes.length,
                name: c.name,
                ext: false,
                genre: c.genre,
                age: c.age,
                char: c
            };

            nodes.push(node);
            c.node = node;

            const key = U.normName(c.name);
            if (key && !byKey.has(key)) byKey.set(key, node);

            c.aliases.forEach((a) => {
                const k = U.normName(a);
                if (k && !aliasMap.has(k)) aliasMap.set(k, node);
            });

            const first = key.split(" ")[0];
            if (first) firstNames.set(first, (firstNames.get(first) || []).concat(node));
        });

        function resolve(text) {
            const key = U.normName(text);
            if (!key) return null;

            let node = byKey.get(key) || aliasMap.get(key);

            if (!node) {
                const list = firstNames.get(key);
                if (list && list.length === 1) node = list[0];
            }

            if (!node) {
                node = { id: nodes.length, name: U.titleCase(text), ext: true, genre: null, age: "" };
                nodes.push(node);
                byKey.set(key, node);
            }

            return node;
        }

        const edges = [];

        chars.forEach((c) => {
            c.relations.forEach((rel) => {
                rel.names.forEach((entry) => {
                    const to = resolve(entry.name);
                    if (!to || to === c.node) return;

                    edges.push({
                        from: c.node,
                        to,
                        label: rel.label,
                        cls: rel.cls,
                        note: entry.note
                    });
                });
            });
        });

        return { nodes, edges };
    }

    function buildFamily(graph) {
        const famEdges = graph.edges.filter(
            (e) => e.cls.cat === "family" && e.cls.delta !== null
        );

        const adj = new Map();
        graph.nodes.forEach((n) => adj.set(n.id, []));

        famEdges.forEach((e) => {
            adj.get(e.from.id).push({ to: e.to, d: e.cls.delta });
            adj.get(e.to.id).push({ to: e.from, d: -e.cls.delta });
        });

        const visited = new Map();
        const components = [];
        const conflicts = [];

        graph.nodes.forEach((start) => {
            if (visited.has(start.id) || adj.get(start.id).length === 0) return;

            const gens = new Map([[start.id, 0]]);
            const members = [start];
            const queue = [start];
            visited.set(start.id, true);
            let conflicted = false;

            while (queue.length) {
                const node = queue.shift();

                adj.get(node.id).forEach(({ to, d }) => {
                    const expected = gens.get(node.id) + d;

                    if (!gens.has(to.id)) {
                        gens.set(to.id, expected);
                        visited.set(to.id, true);
                        members.push(to);
                        queue.push(to);
                    } else if (gens.get(to.id) !== expected) {
                        conflicted = true;
                    }
                });
            }

            const minGen = Math.min(...gens.values());
            gens.forEach((g, id) => gens.set(id, g - minGen));

            if (conflicted) {
                conflicts.push(members.filter((m) => !m.ext).map((m) => m.name));
            }

            components.push({ members, gens, conflicted });
        });

        const parentOf = new Set();
        const spouses = [];
        const siblings = [];
        const extended = [];

        famEdges.forEach((e) => {
            const kind = e.cls.kind;

            if (kind === "parent") parentOf.add(`${e.to.id}>${e.from.id}`);
            else if (kind === "child") parentOf.add(`${e.from.id}>${e.to.id}`);
            else if (kind === "spouse") spouses.push([e.from, e.to]);
            else if (kind === "sibling") siblings.push([e.from, e.to]);
            else extended.push([e.from, e.to]);
        });

        return { components, conflicts, parentOf, spouses, siblings, extended };
    }

    function analyse(data, graph, family, archList) {
        const checks = [];
        const add = (level, text) => checks.push({ level, text });

        const seen = new Map();
        data.chars.forEach((c) => {
            const key = U.normName(c.name);
            seen.set(key, (seen.get(key) || 0) + 1);
        });

        data.chars.forEach((c) => {
            if (!c.hasName) {
                add("review", `"${c.doc.title}" has no NAME filled in yet.`);
            }

            if (seen.get(U.normName(c.name)) > 1) {
                add("review", `More than one character is named "${c.name}".`);
            }

            if (c.dobText && !U.isPlaceholder(c.dobText) && !c.dob) {
                add("review", `${c.name}: birthdate "${c.dobText}" could not be read, so age was not calculated. Try 12/03/1990 or 12 March 1990.`);
            }

            if (!c.age) {
                add("note", `${c.name}: no age or birthdate recorded.`);
            }

            const hasRelations = c.relations.some((r) => r.names.length);
            if (!hasRelations) {
                add("note", `${c.name}: no relationships listed, so they will not appear in the family tree or connection map.`);
            }
        });

        const externals = graph.nodes.filter((n) => n.ext);
        externals.forEach((n) => {
            const mentionedBy = Array.from(
                new Set(graph.edges.filter((e) => e.to === n).map((e) => e.from.name))
            );
            add("note", `"${n.name}" is named as a relative or contact (by ${mentionedBy.join(", ")}) but has no character profile yet.`);
        });

        const pairs = new Set(graph.edges.map((e) => `${e.from.id}>${e.to.id}`));
        const reported = new Set();

        graph.edges.forEach((e) => {
            if (e.to.ext) return;
            if (pairs.has(`${e.to.id}>${e.from.id}`)) return;

            const key = [e.from.id, e.to.id].sort().join("-");
            if (reported.has(key)) return;
            reported.add(key);

            add("note", `${e.from.name} lists ${e.to.name} as ${e.label}, but ${e.to.name}'s profile does not mention ${e.from.name}.`);
        });

        family.conflicts.forEach((names) => {
            add("review", `Family links look inconsistent for: ${names.join(", ")}. Someone may be listed as both an ancestor and a descendant.`);
        });

        archList.forEach((a) => {
            if (a.filledCount === 0) {
                add("note", `${a.typeLabel} "${a.title}" has no details filled in yet.`);
            }
        });

        checks.sort((a, b) => (a.level === b.level ? 0 : a.level === "review" ? -1 : 1));
        return checks;
    }

    /* ============================================================
       PDF DRAWING PRIMITIVES
    ============================================================ */
    class Pen {
        constructor(pdf) {
            this.pdf = pdf;
            this.y = PAGE.top;
            this.sections = [];
        }

        font(style, size, color, family) {
            this.pdf.setFont(family || "helvetica", style || "normal");
            this.pdf.setFontSize(size || 10);
            const c = color || C.ink;
            this.pdf.setTextColor(c[0], c[1], c[2]);
        }

        page() {
            this.pdf.addPage();
            this.y = PAGE.top;
        }

        ensure(height) {
            if (this.y + height > PAGE.h - PAGE.bottom) {
                this.page();
                return true;
            }
            return false;
        }

        lineHeight(size, factor) {
            return size * PT * (factor || 1.4);
        }

        /* Wrapped paragraph with automatic page breaks. Returns final y. */
        paragraph(text, o) {
            o = o || {};
            const size = o.size || 10;
            const x = o.x === undefined ? PAGE.mx : o.x;
            const width = o.width || CW - (x - PAGE.mx);
            const lh = this.lineHeight(size, o.lh);

            this.font(o.style, size, o.color, o.family || "times");

            const lines = this.pdf.splitTextToSize(S(text), width);

            lines.forEach((line) => {
                this.ensure(lh);
                this.font(o.style, size, o.color, o.family || "times");
                this.pdf.text(line, x, this.y + size * PT * 0.8);
                this.y += lh;
            });

            return this.y;
        }

        rule(color, width) {
            const c = color || C.rule;
            this.pdf.setDrawColor(c[0], c[1], c[2]);
            this.pdf.setLineWidth(width || 0.25);
            this.pdf.line(PAGE.mx, this.y, PAGE.w - PAGE.mx, this.y);
        }

        heading(title, o) {
            o = o || {};
            this.ensure(o.minSpace || 34);

            if (o.toc) {
                this.sections.push({ title: o.toc, page: this.pdf.getNumberOfPages() });
            }

            const pdf = this.pdf;
            pdf.setFillColor(C.accent[0], C.accent[1], C.accent[2]);
            pdf.rect(PAGE.mx, this.y, 1.6, 9, "F");

            this.font("bold", 19, C.dark, "times");
            pdf.text(S(title), PAGE.mx + 5, this.y + 7);

            this.y += 12;
            this.rule();
            this.y += 5;
        }

        subheading(title, color) {
            this.ensure(16);
            this.font("bold", 12, color || C.accent, "times");
            this.pdf.text(S(title), PAGE.mx, this.y + 4);
            this.y += 8;
        }

        chip(text, x, y, color) {
            const pdf = this.pdf;
            this.font("bold", 7, color, "helvetica");
            const label = S(text).toUpperCase();
            const w = pdf.getTextWidth(label) + 5;

            pdf.setFillColor(...mix(color, 0.86));
            pdf.setDrawColor(...mix(color, 0.45));
            pdf.setLineWidth(0.2);
            pdf.roundedRect(x, y, w, 5.2, 2.4, 2.4, "FD");
            pdf.text(label, x + 2.5, y + 3.6);

            return w;
        }
    }

    function fitText(pdf, text, maxWidth) {
        let t = S(text);
        if (pdf.getTextWidth(t) <= maxWidth) return t;

        while (t.length > 1 && pdf.getTextWidth(t + "...") > maxWidth) {
            t = t.slice(0, -1);
        }

        return t.trimEnd() + "...";
    }

    /* ============================================================
       SECTIONS
    ============================================================ */
    function drawCover(pen, info) {
        const pdf = pen.pdf;

        pdf.setFillColor(...C.dark);
        pdf.rect(0, 0, PAGE.w, 132, "F");

        const genreIds = Object.keys(GENRE_COLORS);
        const stripW = PAGE.w / genreIds.length;
        genreIds.forEach((id, i) => {
            pdf.setFillColor(...GENRE_COLORS[id]);
            pdf.rect(i * stripW, 132, stripW, 2.4, "F");
        });

        pdf.setFillColor(...C.accent);
        pdf.rect(PAGE.mx, 34, 14, 1.2, "F");

        pen.font("normal", 9, [214, 184, 132], "helvetica");
        pdf.setCharSpace(1.6);
        pdf.text("SCRIPTORIUM NEXUS  -  PRODUCTION REPORT", PAGE.mx, 28);
        pdf.setCharSpace(0);

        pen.font("bold", 34, [250, 243, 224], "times");
        const titleLines = pdf.splitTextToSize(S(info.title), CW).slice(0, 3);
        titleLines.forEach((line, i) => pdf.text(line, PAGE.mx, 56 + i * 15));

        pen.font("italic", 12, [214, 200, 170], "times");
        pdf.text("Characters, family tree, connections and story architecture", PAGE.mx, 56 + titleLines.length * 15 + 4);

        const rows = [
            ["GENERATED", todayLabel()],
            ["PREPARED FOR", info.owner || "Studio Writer"],
            ["GENRES", info.genres],
            ["CONTENTS", `${info.charCount} character${info.charCount === 1 ? "" : "s"}  /  ${info.archCount} architecture document${info.archCount === 1 ? "" : "s"}`]
        ];

        let y = 160;
        rows.forEach(([label, value]) => {
            pen.font("bold", 7.5, C.muted, "helvetica");
            pdf.setCharSpace(1.2);
            pdf.text(label, PAGE.mx, y);
            pdf.setCharSpace(0);

            pen.font("normal", 12, C.ink, "times");
            const wrapped = pdf.splitTextToSize(S(value), CW - 42).slice(0, 2);
            wrapped.forEach((line, i) => pdf.text(line, PAGE.mx + 42, y + i * 5.5));

            y += 8 + (wrapped.length - 1) * 5.5;
            pdf.setDrawColor(...C.rule);
            pdf.setLineWidth(0.2);
            pdf.line(PAGE.mx, y - 4.5, PAGE.w - PAGE.mx, y - 4.5);
            y += 5;
        });

        pen.font("italic", 9, C.muted, "times");
        const note = "This report is generated from the documents in your Characters and Architecture folders. Review the checks on page 2, then correct anything in the editor and generate a fresh report.";
        pdf.splitTextToSize(note, CW).forEach((line, i) => pdf.text(line, PAGE.mx, 262 + i * 4.4));
    }

    function drawContentsPlaceholder(pen) {
        pen.y = PAGE.top;
        pen.font("bold", 19, C.dark, "times");
        pen.pdf.setFillColor(...C.accent);
        pen.pdf.rect(PAGE.mx, pen.y, 1.6, 9, "F");
        pen.pdf.text("Contents", PAGE.mx + 5, pen.y + 7);
        pen.y += 12;
        pen.rule();
        pen.contentsTop = pen.y + 4;
        pen.y += 4 + 7 * 6 + 8;
    }

    function fillContents(pen) {
        const pdf = pen.pdf;
        pdf.setPage(2);

        let y = pen.contentsTop;

        pen.sections.forEach((section) => {
            pen.font("normal", 11, C.ink, "times");
            pdf.text(S(section.title), PAGE.mx + 2, y + 4);

            const numberText = String(section.page);
            const numW = pdf.getTextWidth(numberText);
            pdf.text(numberText, PAGE.w - PAGE.mx - numW, y + 4);

            const titleW = pdf.getTextWidth(S(section.title));
            pdf.setDrawColor(...C.rule);
            pdf.setLineDashPattern([0.6, 1.2], 0);
            pdf.line(PAGE.mx + 4 + titleW, y + 4, PAGE.w - PAGE.mx - numW - 2, y + 4);
            pdf.setLineDashPattern([], 0);

            y += 6;
        });
    }

    function drawChecks(pen, checks) {
        pen.heading("Review Checks", { toc: "Review checks", minSpace: 30 });

        const reviews = checks.filter((c) => c.level === "review").length;

        if (!checks.length) {
            pen.paragraph("No problems found. Every character has a name, ages are consistent, and all listed relatives were matched.", {
                size: 11, style: "normal"
            });
            return;
        }

        pen.paragraph(
            `${reviews} item${reviews === 1 ? "" : "s"} to review and ${checks.length - reviews} note${checks.length - reviews === 1 ? "" : "s"}. ` +
            "Items marked REVIEW are likely mistakes; NOTES are gaps you may want to fill.",
            { size: 10, style: "italic", color: C.muted }
        );
        pen.y += 3;

        checks.forEach((check) => {
            const pdf = pen.pdf;
            const width = CW - 20;
            pen.font("normal", 10, C.ink, "times");
            const lines = pdf.splitTextToSize(S(check.text), width);
            const h = Math.max(6, lines.length * pen.lineHeight(10, 1.35)) + 2;

            pen.ensure(h);

            const color = check.level === "review" ? C.warn : C.muted;
            pdf.setFillColor(...mix(color, 0.85));
            pdf.setDrawColor(...mix(color, 0.4));
            pdf.setLineWidth(0.2);
            pdf.roundedRect(PAGE.mx, pen.y + 0.4, 15, 5, 2, 2, "FD");
            pen.font("bold", 6.5, color, "helvetica");
            pdf.text(check.level === "review" ? "REVIEW" : "NOTE", PAGE.mx + 7.5, pen.y + 3.9, { align: "center" });

            pen.font("normal", 10, C.ink, "times");
            lines.forEach((line, i) => {
                pdf.text(line, PAGE.mx + 19, pen.y + 3.9 + i * pen.lineHeight(10, 1.35));
            });

            pen.y += h;
        });

        pen.y += 4;
    }

    function drawCharacterSummary(pen, data, engineConfig) {
        pen.page();
        pen.heading("Characters", { toc: "Character summary", minSpace: 40 });

        if (!data.chars.length) {
            pen.paragraph("No character profiles were found. Create characters in the Characters folder and generate the report again.", { size: 11, style: "italic", color: C.muted });
            return;
        }

        const pdf = pen.pdf;
        const cols = [
            { title: "NAME", w: 50 },
            { title: "GENRE", w: 26 },
            { title: "AGE", w: 14 },
            { title: "ROLE", w: 36 },
            { title: "STATUS", w: 26 },
            { title: "COMPLETE", w: 26 }
        ];

        function header() {
            pdf.setFillColor(...C.dark);
            pdf.rect(PAGE.mx, pen.y, CW, 7, "F");
            let x = PAGE.mx + 2;
            pen.font("bold", 7, [240, 226, 196], "helvetica");
            cols.forEach((col) => {
                pdf.text(col.title, x, pen.y + 4.7);
                x += col.w;
            });
            pen.y += 7;
        }

        header();

        data.chars.forEach((c, index) => {
            if (pen.ensure(9)) header();

            if (index % 2 === 0) {
                pdf.setFillColor(...C.soft);
                pdf.rect(PAGE.mx, pen.y, CW, 8, "F");
            }

            const color = GENRE_COLORS[c.genre] || C.accent;
            pdf.setFillColor(...color);
            pdf.rect(PAGE.mx, pen.y, 1.2, 8, "F");

            const cells = [
                c.name,
                c.genreLabel,
                c.age || "-",
                c.facts.ROLE || "-",
                c.facts.STATUS || "-",
                `${c.pct}%`
            ];

            let x = PAGE.mx + 3;
            cells.forEach((cell, i) => {
                pen.font(i === 0 ? "bold" : "normal", 9, C.ink, "times");
                pdf.text(fitText(pdf, cell, cols[i].w - 4), x, pen.y + 5.4);
                x += cols[i].w;
            });

            const barX = PAGE.mx + CW - 22;
            pdf.setFillColor(...C.rule);
            pdf.rect(barX, pen.y + 6.2, 16, 1, "F");
            pdf.setFillColor(...(c.pct >= 60 ? C.ally : C.warn));
            pdf.rect(barX, pen.y + 6.2, 16 * (c.pct / 100), 1, "F");

            pen.y += 8;
        });

        pen.y += 4;
        pen.paragraph("COMPLETE shows how much of each profile (excluding relationships) has been filled in.", { size: 8.5, style: "italic", color: C.muted });
    }

    function drawCharacterProfile(pen, c) {
        const pdf = pen.pdf;
        pen.ensure(70);

        const color = GENRE_COLORS[c.genre] || C.accent;

        pdf.setFillColor(...mix(color, 0.88));
        pdf.roundedRect(PAGE.mx, pen.y, CW, 16, 2, 2, "F");
        pdf.setFillColor(...color);
        pdf.roundedRect(PAGE.mx, pen.y, 2.4, 16, 1, 1, "F");

        pen.font("bold", 16, C.dark, "times");
        pdf.text(fitText(pdf, c.name, CW - 50), PAGE.mx + 7, pen.y + 8);

        pen.chip(c.genreLabel, PAGE.mx + CW - 30, pen.y + 3, color);

        pen.font("italic", 9, C.muted, "times");
        const sub = [c.facts.ROLE, c.facts.ARCHETYPE].filter(Boolean).join("  -  ");
        if (sub) pdf.text(fitText(pdf, sub, CW - 14), PAGE.mx + 7, pen.y + 13);

        pen.y += 20;

        const facts = [];
        const add = (label, value) => {
            if (value) facts.push([label, value]);
        };

        add("AGE", c.age);
        add("BIRTHDATE", c.facts.BIRTHDATE);
        add("GENDER", c.facts.GENDER);
        add("SPECIES", c.facts.SPECIES);
        add("OCCUPATION", c.facts.OCCUPATION);
        add("STATUS", c.facts.STATUS);
        add("ALIAS", c.facts.ALIAS);
        add("HEIGHT", c.facts.HEIGHT);
        add("WEIGHT", c.facts.WEIGHT);

        if (facts.length) {
            const colW = CW / 3;
            let col = 0;
            let rowY = pen.y;

            facts.forEach(([label, value]) => {
                if (col === 0) pen.ensure(11);
                if (col === 0) rowY = pen.y;

                const x = PAGE.mx + col * colW;
                pen.font("bold", 6.5, C.muted, "helvetica");
                pdf.setCharSpace(0.8);
                pdf.text(label, x, rowY + 2.5);
                pdf.setCharSpace(0);

                pen.font("normal", 10, C.ink, "times");
                pdf.text(fitText(pdf, value.replace(/\n/g, " "), colW - 4), x, rowY + 7);

                col += 1;
                if (col === 3) {
                    col = 0;
                    pen.y = rowY + 11;
                }
            });

            if (col !== 0) pen.y = rowY + 11;
            pen.y += 1;
        }

        let lastSection = null;

        c.narrative.forEach((f) => {
            if (f.empty) return;

            if (f.section && f.section !== lastSection) {
                pen.y += 2;
                pen.subheading(f.section, color);
            }

            lastSection = f.section;

            pen.ensure(12);
            pen.font("bold", 7, C.muted, "helvetica");
            pdf.setCharSpace(0.8);
            pdf.text(S(f.label), PAGE.mx, pen.y + 2.4);
            pdf.setCharSpace(0);
            pen.y += 4;
            pen.paragraph(f.value, { size: 10.5, x: PAGE.mx + 2, width: CW - 2 });
            pen.y += 2;
        });

        const filledRelations = c.relations.filter((r) => r.names.length);

        if (filledRelations.length) {
            pen.y += 2;
            pen.subheading("Relationships", color);

            filledRelations.forEach((r) => {
                const names = r.names.map((n) => (n.note ? `${n.name} (${n.note})` : n.name)).join(", ");
                const catColor = C[r.cls.cat] || C.other;

                pen.ensure(7);
                pdf.setFillColor(...catColor);
                pdf.circle(PAGE.mx + 2, pen.y + 2.6, 1.1, "F");
                pen.font("bold", 9.5, C.ink, "times");
                pdf.text(S(r.label), PAGE.mx + 6, pen.y + 3.6);
                pen.font("normal", 10, C.ink, "times");

                const lines = pdf.splitTextToSize(S(names), CW - 44);
                lines.forEach((line, i) => {
                    if (i > 0) pen.ensure(5);
                    pdf.text(line, PAGE.mx + 38, pen.y + 3.6);
                    if (i < lines.length - 1) pen.y += 4.8;
                });

                pen.y += 6.2;
            });
        }

        pen.y += 6;
        pen.rule(C.rule, 0.2);
        pen.y += 6;
    }

    /* ---------- family tree ---------- */
    function nodeColors(node) {
        if (node.ext) return { fill: [255, 255, 255], line: C.other, text: C.muted };
        const base = GENRE_COLORS[node.genre] || C.accent;
        return { fill: mix(base, 0.86), line: base, text: C.dark };
    }

    function drawFamilyTree(pen, graph, family) {
        pen.page();
        pen.heading("Family Tree", { toc: "Family tree", minSpace: 40 });

        const pdf = pen.pdf;

        if (!family.components.length) {
            pen.paragraph(
                "No family relationships have been recorded yet. In each character profile, fill in Mother, Father, Brother, Sister, Spouse or Children with the exact character names, then generate the report again.",
                { size: 11, style: "italic", color: C.muted }
            );
            return;
        }

        function legend() {
            pen.font("normal", 8, C.muted, "helvetica");
            const y = pen.y + 2;
            pdf.setDrawColor(...C.accent);
            pdf.setFillColor(...mix(C.accent, 0.86));
            pdf.setLineWidth(0.4);
            pdf.roundedRect(PAGE.mx, y, 9, 4.6, 1, 1, "FD");
            pdf.text("Has a character profile", PAGE.mx + 11, y + 3.4);

            pdf.setLineDashPattern([0.9, 0.9], 0);
            pdf.setDrawColor(...C.other);
            pdf.setFillColor(255, 255, 255);
            pdf.roundedRect(PAGE.mx + 52, y, 9, 4.6, 1, 1, "FD");
            pdf.setLineDashPattern([], 0);
            pdf.text("Named relative, no profile yet", PAGE.mx + 63, y + 3.4);

            pdf.setDrawColor(...C.ink);
            pdf.setLineWidth(0.3);
            pdf.line(PAGE.mx + 116, y + 1.9, PAGE.mx + 125, y + 1.9);
            pdf.line(PAGE.mx + 116, y + 3.2, PAGE.mx + 125, y + 3.2);
            pdf.text("Spouse", PAGE.mx + 127, y + 3.4);

            pdf.setLineDashPattern([0.9, 0.9], 0);
            pdf.line(PAGE.mx + 145, y + 2.5, PAGE.mx + 156, y + 2.5);
            pdf.setLineDashPattern([], 0);
            pdf.text("Extended relative", PAGE.mx + 158, y + 3.4);

            pen.y += 10;
        }

        legend();

        family.components.forEach((comp, index) => {
            const gensCount = Math.max(...comp.gens.values()) + 1;
            const estimated = gensCount * 15 + (gensCount - 1) * 19 + 22;

            if (index > 0 || pen.y + estimated > PAGE.h - PAGE.bottom) {
                if (index > 0) pen.ensure(estimated);
            }

            layoutAndDrawComponent(pen, comp, family);
            pen.y += 8;
        });

        const inTree = new Set();
        family.components.forEach((comp) => comp.members.forEach((m) => inTree.add(m.id)));

        const loose = graph.nodes.filter((n) => !n.ext && !inTree.has(n.id)).map((n) => n.name);

        if (loose.length) {
            pen.ensure(14);
            pen.paragraph(`Characters with no family links recorded: ${loose.join(", ")}.`, {
                size: 9.5, style: "italic", color: C.muted
            });
        }
    }

    function layoutAndDrawComponent(pen, comp, family) {
        const pdf = pen.pdf;
        const gens = comp.gens;
        const maxGen = Math.max(...gens.values());

        const memberIds = new Set(comp.members.map((m) => m.id));
        const parentsOf = new Map();
        const childrenOf = new Map();

        family.parentOf.forEach((pair) => {
            const [p, c] = pair.split(">").map(Number);
            if (!memberIds.has(p) || !memberIds.has(c)) return;
            if (!parentsOf.has(c)) parentsOf.set(c, new Set());
            if (!childrenOf.has(p)) childrenOf.set(p, new Set());
            parentsOf.get(c).add(p);
            childrenOf.get(p).add(c);
        });

        const byId = new Map(comp.members.map((m) => [m.id, m]));

        /* units = spouse groups within one generation */
        const rows = [];
        for (let g = 0; g <= maxGen; g += 1) {
            const inGen = comp.members.filter((m) => gens.get(m.id) === g);
            const parent = new Map(inGen.map((m) => [m.id, m.id]));
            const find = (id) => (parent.get(id) === id ? id : (parent.set(id, find(parent.get(id))), parent.get(id)));

            family.spouses.forEach(([a, b]) => {
                if (parent.has(a.id) && parent.has(b.id)) parent.set(find(a.id), find(b.id));
            });

            const groups = new Map();
            inGen.forEach((m) => {
                const root = find(m.id);
                if (!groups.has(root)) groups.set(root, []);
                groups.get(root).push(m);
            });

            rows[g] = Array.from(groups.values()).map((members) =>
                members.sort((x, y) => x.name.localeCompare(y.name))
            );
            rows[g].sort((x, y) => x[0].name.localeCompare(y[0].name));
        }

        /* order children under their parents (barycentre heuristic) */
        const posIndex = new Map();
        rows.forEach((units, g) => {
            if (g > 0) {
                const keyOf = (unit) => {
                    const values = [];
                    unit.forEach((m) => {
                        const ps = parentsOf.get(m.id);
                        if (!ps) return;
                        const xs = Array.from(ps).map((p) => posIndex.get(p)).filter((v) => v !== undefined);
                        if (xs.length) values.push(xs.reduce((a, b) => a + b, 0) / xs.length);
                    });
                    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : Infinity;
                };

                units.sort((a, b) => {
                    const ka = keyOf(a);
                    const kb = keyOf(b);
                    if (ka === kb) return 0;
                    return ka < kb ? -1 : 1;
                });
            }

            let i = 0;
            units.forEach((unit) => unit.forEach((m) => posIndex.set(m.id, i++)));
        });

        /* size + scale */
        const BASE = { nodeW: 36, nodeH: 15, gapS: 11, gapU: 9, vgap: 19 };
        const rowWidth = (units, s) => {
            let w = 0;
            units.forEach((unit, ui) => {
                w += unit.length * BASE.nodeW * s + (unit.length - 1) * BASE.gapS * s;
                if (ui > 0) w += BASE.gapU * s;
            });
            return w;
        };

        const widest = Math.max(...rows.map((units) => rowWidth(units, 1)));
        const scale = Math.max(0.5, Math.min(1, CW / widest));
        const nodeW = BASE.nodeW * scale;
        const nodeH = BASE.nodeH;
        const gapS = BASE.gapS * scale;
        const gapU = BASE.gapU * scale;

        let vgap = BASE.vgap;
        const usable = PAGE.h - PAGE.bottom - pen.y - 16;
        const needed = (maxGen + 1) * nodeH + maxGen * vgap;
        if (needed > usable) vgap = Math.max(11, (usable - (maxGen + 1) * nodeH) / Math.max(1, maxGen));

        const total = (maxGen + 1) * nodeH + maxGen * vgap + 14;
        pen.ensure(total + 10);

        /* title */
        const named = comp.members.filter((m) => !m.ext);
        const lastNames = {};
        named.forEach((m) => {
            const parts = m.name.split(" ");
            if (parts.length > 1) {
                const ln = parts[parts.length - 1];
                lastNames[ln] = (lastNames[ln] || 0) + 1;
            }
        });
        const topLast = Object.keys(lastNames).sort((a, b) => lastNames[b] - lastNames[a])[0];
        const label = topLast && lastNames[topLast] > 1 ? `The ${topLast} family` : (named[0] || comp.members[0]).name + "'s family";

        pen.font("bold", 12, C.accent, "times");
        pdf.text(S(label), PAGE.mx, pen.y + 4);
        if (comp.conflicted) {
            pen.font("italic", 8.5, C.warn, "times");
            pdf.text("Some links conflict - see Review checks", PAGE.mx + 70, pen.y + 4);
        }
        pen.y += 10;

        const top = pen.y;
        const pos = new Map();

        rows.forEach((units, g) => {
            const w = rowWidth(units, scale);
            let x = PAGE.mx + (CW - w) / 2;
            const y = top + g * (nodeH + vgap);

            units.forEach((unit, ui) => {
                if (ui > 0) x += gapU;
                unit.forEach((m, mi) => {
                    if (mi > 0) x += gapS;
                    pos.set(m.id, { x, y, cx: x + nodeW / 2 });
                    x += nodeW;
                });
            });
        });

        /* connectors: spouses */
        pdf.setDrawColor(...C.ink);
        pdf.setLineWidth(0.35);

        family.spouses.forEach(([a, b]) => {
            const pa = pos.get(a.id);
            const pb = pos.get(b.id);
            if (!pa || !pb || pa.y !== pb.y) return;

            const left = pa.x < pb.x ? pa : pb;
            const right = pa.x < pb.x ? pb : pa;
            const yMid = left.y + nodeH / 2;

            pdf.line(left.x + nodeW, yMid - 0.7, right.x, yMid - 0.7);
            pdf.line(left.x + nodeW, yMid + 0.7, right.x, yMid + 0.7);
        });

        /* connectors: parents -> children (grouped by identical parent sets) */
        const groups = new Map();
        childrenOf.forEach((kids, p) => {
            kids.forEach((k) => {
                const key = Array.from(parentsOf.get(k)).sort((x, y) => x - y).join(",");
                if (!groups.has(key)) groups.set(key, { parents: Array.from(parentsOf.get(k)), kids: new Set() });
                groups.get(key).kids.add(k);
            });
        });

        pdf.setDrawColor(...C.accent);
        pdf.setLineWidth(0.5);

        groups.forEach((group) => {
            const pp = group.parents.map((id) => pos.get(id)).filter(Boolean);
            const kk = Array.from(group.kids).map((id) => pos.get(id)).filter(Boolean);
            if (!pp.length || !kk.length) return;

            const parentBottom = Math.max(...pp.map((p) => p.y)) + nodeH;
            const anchorX = pp.reduce((a, p) => a + p.cx, 0) / pp.length;
            const stubY = parentBottom + 3;
            const busY = parentBottom + (kk[0].y - parentBottom) * 0.55;

            pp.forEach((p) => {
                pdf.line(p.cx, p.y + nodeH, p.cx, stubY);
            });

            if (pp.length > 1) {
                const xs = pp.map((p) => p.cx);
                pdf.line(Math.min(...xs), stubY, Math.max(...xs), stubY);
            }

            pdf.line(anchorX, stubY, anchorX, busY);

            const kx = kk.map((k) => k.cx);
            pdf.line(Math.min(anchorX, ...kx), busY, Math.max(anchorX, ...kx), busY);

            kk.forEach((k) => pdf.line(k.cx, busY, k.cx, k.y));
        });

        /* siblings without a shared parent: dashed bracket above */
        const shared = new Set();
        groups.forEach((group) => {
            const ids = Array.from(group.kids);
            ids.forEach((a) => ids.forEach((b) => a !== b && shared.add(`${a}-${b}`)));
        });

        pdf.setDrawColor(...C.accent);
        pdf.setLineWidth(0.35);
        pdf.setLineDashPattern([0.9, 0.9], 0);

        family.siblings.forEach(([a, b]) => {
            const pa = pos.get(a.id);
            const pb = pos.get(b.id);
            if (!pa || !pb || pa.y !== pb.y || shared.has(`${a.id}-${b.id}`)) return;

            const y = pa.y - 3.2;
            pdf.line(pa.cx, pa.y, pa.cx, y);
            pdf.line(pb.cx, pb.y, pb.cx, y);
            pdf.line(pa.cx, y, pb.cx, y);
        });

        pdf.setDrawColor(...C.other);
        family.extended.forEach(([a, b]) => {
            const pa = pos.get(a.id);
            const pb = pos.get(b.id);
            if (!pa || !pb) return;

            const aboveA = pa.y <= pb.y;
            const y1 = aboveA ? pa.y + nodeH : pa.y;
            const y2 = aboveA ? pb.y : pb.y + nodeH;
            if (pa.y === pb.y) return;
            pdf.line(pa.cx, y1, pb.cx, y2);
        });

        pdf.setLineDashPattern([], 0);

        /* nodes */
        comp.members.forEach((m) => {
            const p = pos.get(m.id);
            if (!p) return;

            const colors = nodeColors(m);
            pdf.setFillColor(...colors.fill);
            pdf.setDrawColor(...colors.line);
            pdf.setLineWidth(0.5);

            if (m.ext) pdf.setLineDashPattern([0.9, 0.9], 0);
            pdf.roundedRect(p.x, p.y, nodeW, nodeH, 2, 2, "FD");
            pdf.setLineDashPattern([], 0);

            pen.font(m.ext ? "italic" : "bold", 8.5 * Math.max(0.8, scale), colors.text, "times");
            pdf.text(fitText(pdf, m.name, nodeW - 4), p.cx, p.y + 6.2, { align: "center" });

            const sub = m.ext ? "no profile yet" : m.age ? `Age ${m.age}` : "";
            if (sub) {
                pen.font("normal", 7, C.muted, "helvetica");
                pdf.text(sub, p.cx, p.y + 11.2, { align: "center" });
            }
        });

        pen.y = top + (maxGen + 1) * nodeH + maxGen * vgap + 6;
    }

    /* ---------- connection map ---------- */
    function drawConnections(pen, graph) {
        pen.page();
        pen.heading("Character Connections", { toc: "Character connections", minSpace: 40 });

        const pdf = pen.pdf;

        /* merge duplicate links between the same two people */
        const merged = new Map();

        graph.edges.forEach((e) => {
            const key = [e.from.id, e.to.id].sort((a, b) => a - b).join("-") + "|" + e.cls.cat;
            const entry = merged.get(key);

            if (!entry) {
                merged.set(key, { a: e.from, b: e.to, cat: e.cls.cat, labels: [e.label] });
            } else if (!entry.labels.includes(e.label)) {
                entry.labels.push(e.label);
            }
        });

        const links = Array.from(merged.values());

        if (!links.length) {
            pen.paragraph(
                "No connections have been recorded yet. Fill in the Relationships sections of your character profiles (friends, enemies, family, lovers, allies) and generate the report again.",
                { size: 11, style: "italic", color: C.muted }
            );
            return;
        }

        const degree = new Map();
        links.forEach((l) => {
            degree.set(l.a.id, (degree.get(l.a.id) || 0) + 1);
            degree.set(l.b.id, (degree.get(l.b.id) || 0) + 1);
        });

        let nodes = graph.nodes.filter((n) => degree.has(n.id));

        if (nodes.length > 30) {
            nodes = nodes.filter((n) => !n.ext || degree.get(n.id) > 1).slice(0, 30);
        }

        const nodeSet = new Set(nodes.map((n) => n.id));
        const drawLinks = links.filter((l) => nodeSet.has(l.a.id) && nodeSet.has(l.b.id));

        /* legend */
        let lx = PAGE.mx;
        Object.keys(CAT_LABELS).forEach((cat) => {
            pdf.setDrawColor(...C[cat]);
            pdf.setLineWidth(0.9);
            pdf.line(lx, pen.y + 3, lx + 7, pen.y + 3);
            pen.font("normal", 8, C.muted, "helvetica");
            pdf.text(CAT_LABELS[cat], lx + 9, pen.y + 3.9);
            lx += 9 + pdf.getTextWidth(CAT_LABELS[cat]) + 6;
        });
        pen.y += 9;

        /* order nodes so connected people sit next to each other */
        const adj = new Map(nodes.map((n) => [n.id, []]));
        drawLinks.forEach((l) => {
            adj.get(l.a.id).push(l.b);
            adj.get(l.b.id).push(l.a);
        });

        const ordered = [];
        const seen = new Set();
        const byDegree = [...nodes].sort((a, b) => degree.get(b.id) - degree.get(a.id));

        const visit = (n) => {
            if (seen.has(n.id)) return;
            seen.add(n.id);
            ordered.push(n);
            adj.get(n.id)
                .sort((a, b) => degree.get(b.id) - degree.get(a.id))
                .forEach(visit);
        };

        byDegree.forEach(visit);

        const count = ordered.length;
        const dense = count > 14;
        const boxW = dense ? 26 : 32;
        const boxH = dense ? 7 : 8.5;
        const radius = count === 1 ? 0 : count === 2 ? 40 : Math.min(72, 34 + count * 3.4);
        const cxm = PAGE.w / 2;
        const cym = pen.y + radius + boxH + 6;

        pen.ensure(radius * 2 + boxH * 2 + 14);

        const cy = pen.y + radius + boxH + 6;
        const coords = new Map();

        ordered.forEach((n, i) => {
            const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
            coords.set(n.id, {
                x: cxm + Math.cos(angle) * radius * (count === 2 ? 1 : 1.18),
                y: cy + Math.sin(angle) * radius
            });
        });

        const showLabels = drawLinks.length <= 18;

        drawLinks.forEach((l) => {
            const a = coords.get(l.a.id);
            const b = coords.get(l.b.id);
            if (!a || !b) return;

            pdf.setDrawColor(...C[l.cat]);
            pdf.setLineWidth(0.55);
            pdf.line(a.x, a.y, b.x, b.y);
        });

        if (showLabels) {
            drawLinks.forEach((l) => {
                const a = coords.get(l.a.id);
                const b = coords.get(l.b.id);
                if (!a || !b) return;

                const text = S(l.labels.slice(0, 2).join(" / "));
                pen.font("normal", 6.5, C[l.cat], "helvetica");
                const w = pdf.getTextWidth(text) + 2.4;
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2;

                pdf.setFillColor(255, 255, 255);
                pdf.rect(mx - w / 2, my - 2.1, w, 4.2, "F");
                pdf.text(text, mx, my + 1, { align: "center" });
            });
        }

        ordered.forEach((n) => {
            const p = coords.get(n.id);
            const colors = nodeColors(n);

            pdf.setFillColor(...colors.fill);
            pdf.setDrawColor(...colors.line);
            pdf.setLineWidth(0.55);

            if (n.ext) pdf.setLineDashPattern([0.9, 0.9], 0);
            pdf.roundedRect(p.x - boxW / 2, p.y - boxH / 2, boxW, boxH, 2.4, 2.4, "FD");
            pdf.setLineDashPattern([], 0);

            pen.font(n.ext ? "italic" : "bold", dense ? 7 : 8, colors.text, "times");
            pdf.text(fitText(pdf, n.name, boxW - 3), p.x, p.y + 1.1, { align: "center" });
        });

        pen.y = cy + radius + boxH + 8;

        const loose = graph.nodes.filter((n) => !n.ext && !degree.has(n.id)).map((n) => n.name);
        if (loose.length) {
            pen.paragraph(`No recorded connections: ${loose.join(", ")}.`, { size: 9.5, style: "italic", color: C.muted });
        }

        /* connection list */
        pen.y += 4;
        pen.subheading("Connection list");

        const cols = [
            { title: "CHARACTER", w: 52 },
            { title: "RELATION", w: 40 },
            { title: "CONNECTED TO", w: 56 },
            { title: "TYPE", w: 30 }
        ];

        function header() {
            pdf.setFillColor(...C.dark);
            pdf.rect(PAGE.mx, pen.y, CW, 6.5, "F");
            let x = PAGE.mx + 2;
            pen.font("bold", 7, [240, 226, 196], "helvetica");
            cols.forEach((col) => {
                pdf.text(col.title, x, pen.y + 4.4);
                x += col.w;
            });
            pen.y += 6.5;
        }

        header();

        const rows = [...graph.edges].sort((a, b) => a.from.name.localeCompare(b.from.name));

        rows.forEach((e, i) => {
            if (pen.ensure(7)) header();

            if (i % 2 === 0) {
                pdf.setFillColor(...C.soft);
                pdf.rect(PAGE.mx, pen.y, CW, 6.6, "F");
            }

            const color = C[e.cls.cat] || C.other;
            pdf.setFillColor(...color);
            pdf.rect(PAGE.mx, pen.y, 1, 6.6, "F");

            const cells = [
                e.from.name,
                e.label,
                e.note ? `${e.to.name} (${e.note})` : e.to.name + (e.to.ext ? " *" : ""),
                CAT_LABELS[e.cls.cat] || "Other"
            ];

            let x = PAGE.mx + 3;
            cells.forEach((cell, ci) => {
                pen.font(ci === 0 ? "bold" : "normal", 8.8, ci === 3 ? color : C.ink, "times");
                pdf.text(fitText(pdf, cell, cols[ci].w - 3), x, pen.y + 4.5);
                x += cols[ci].w;
            });

            pen.y += 6.6;
        });

        pen.y += 3;
        pen.paragraph("* named relative who has no character profile yet.", { size: 8.5, style: "italic", color: C.muted });
    }

    /* ---------- architecture ---------- */
    function drawArchitecture(pen, archList) {
        pen.page();
        pen.heading("Story Architecture", { toc: "Story architecture", minSpace: 40 });

        const pdf = pen.pdf;

        if (!archList.length) {
            pen.paragraph("No architecture documents were found. Create them in the Architecture folder and generate the report again.", { size: 11, style: "italic", color: C.muted });
            return;
        }

        archList.forEach((a) => {
            pen.ensure(48);

            const color = GENRE_COLORS[a.genre] || C.accent;

            pdf.setFillColor(...mix(color, 0.88));
            pdf.roundedRect(PAGE.mx, pen.y, CW, 14, 2, 2, "F");
            pdf.setFillColor(...color);
            pdf.roundedRect(PAGE.mx, pen.y, 2.4, 14, 1, 1, "F");

            pen.font("bold", 14, C.dark, "times");
            pdf.text(fitText(pdf, a.title, CW - 62), PAGE.mx + 7, pen.y + 6.6);

            pen.font("normal", 8.5, C.muted, "helvetica");
            pdf.text(S(a.typeLabel), PAGE.mx + 7, pen.y + 11.2);

            pen.chip(a.genreLabel, PAGE.mx + CW - 30, pen.y + 4.4, color);

            pen.y += 18;

            const filled = a.fields.filter((f) => !f.empty);

            if (!filled.length) {
                pen.paragraph("No details filled in yet.", { size: 10, style: "italic", color: C.muted });
            }

            let lastSection = null;

            filled.forEach((f) => {
                if (f.section && f.section !== lastSection) {
                    pen.subheading(f.section, color);
                }
                lastSection = f.section;

                pen.ensure(12);
                pen.font("bold", 7, C.muted, "helvetica");
                pdf.setCharSpace(0.8);
                pdf.text(S(f.label), PAGE.mx, pen.y + 2.4);
                pdf.setCharSpace(0);
                pen.y += 4;
                pen.paragraph(f.value, { size: 10.5, x: PAGE.mx + 2, width: CW - 2 });
                pen.y += 2;
            });

            const missing = a.total - a.filledCount;
            if (missing > 0 && filled.length) {
                pen.paragraph(`${a.filledCount} of ${a.total} fields filled in.`, { size: 8.5, style: "italic", color: C.muted });
            }

            pen.y += 4;
            pen.rule(C.rule, 0.2);
            pen.y += 7;
        });
    }

    function drawFooters(pdf, title) {
        const pages = pdf.getNumberOfPages();

        for (let i = 2; i <= pages; i += 1) {
            pdf.setPage(i);
            pdf.setDrawColor(...C.rule);
            pdf.setLineWidth(0.2);
            pdf.line(PAGE.mx, PAGE.h - 13, PAGE.w - PAGE.mx, PAGE.h - 13);

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(7.5);
            pdf.setTextColor(...C.muted);
            pdf.text(S(`Scriptorium Nexus  |  ${title}`), PAGE.mx, PAGE.h - 8.5);
            pdf.text(`Page ${i} of ${pages}`, PAGE.w - PAGE.mx, PAGE.h - 8.5, { align: "right" });
        }
    }

    /* ============================================================
       PUBLIC API
    ============================================================ */
    function generate(opts) {
        const jsPDF = window.jspdf && window.jspdf.jsPDF;
        if (!jsPDF) throw new Error("The PDF library did not load.");

        const { project, engineConfig } = opts;
        const data = collect(opts);
        const graph = buildGraph(data.chars);
        const family = buildFamily(graph);
        const checks = analyse(data, graph, family, data.arch);

        const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
        const pen = new Pen(pdf);

        const genreSet = Array.from(
            new Set([...data.chars, ...data.arch].map((x) => x.genreLabel))
        );

        const title = (project && project.title) || "Untitled Production";
        const projectGenres = ((project && project.engines) || [])
            .map((id) => genreLabel(id, engineConfig))
            .join(", ");

        drawCover(pen, {
            title,
            owner: opts.ownerEmail,
            genres: projectGenres || genreSet.join(", ") || "Normal",
            charCount: data.chars.length,
            archCount: data.arch.length
        });

        pdf.addPage();
        drawContentsPlaceholder(pen);

        drawChecks(pen, checks);

        drawCharacterSummary(pen, data, engineConfig);

        if (data.chars.length) {
            pen.y += 6;
            pen.ensure(30);
            pen.subheading("Character Profiles");
            pen.sections.push({ title: "Character profiles", page: pdf.getNumberOfPages() });
            pen.y += 2;
            data.chars.forEach((c) => drawCharacterProfile(pen, c));
        }

        drawFamilyTree(pen, graph, family);
        drawConnections(pen, graph);
        drawArchitecture(pen, data.arch);

        fillContents(pen);
        drawFooters(pdf, title);

        const filename = `${slug(title)}_production_report_${new Date().toISOString().slice(0, 10)}.pdf`;

        if (opts.save !== false) pdf.save(filename);

        return {
            filename,
            pages: pdf.getNumberOfPages(),
            characters: data.chars.length,
            architecture: data.arch.length,
            checks: checks.length,
            doc: pdf
        };
    }

    window.ScriptoriumReport = { generate, S };
})();
