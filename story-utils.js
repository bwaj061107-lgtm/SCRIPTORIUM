/* ============================================================
SCRIPTORIUM NEXUS V14 — STORY UTILITIES
Shared helpers used by the Soundstage (automation) and the
Production Report (PDF):
- Field parsing  (<p><strong>LABEL:</strong> value</p> documents)
- Birthdate parsing + automatic age calculation
- Relationship classification + name splitting
============================================================ */
(() => {
    "use strict";

    const MONTHS = {
        jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
        may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
        sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
        dec: 11, december: 11
    };

    /* ---------- text helpers ---------- */
    function flat(value) {
        return String(value == null ? "" : value)
            .replace(/\u00a0/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function tidyLines(value) {
        return String(value == null ? "" : value)
            .replace(/\u00a0/g, " ")
            .split("\n")
            .map((line) => line.replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .join("\n");
    }

    function normName(value) {
        return flat(value)
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9 ]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function isPlaceholder(value) {
        const t = flat(value);
        return !t || /^\(.*\)$/.test(t);
    }

    function toElement(html) {
        const box = document.createElement("div");
        box.innerHTML = String(html || "");
        return box;
    }

    /* Text of a node, keeping <br> and block boundaries as newlines. */
    function textWithBreaks(node) {
        if (!node) return "";
        if (node.nodeType === 3) return node.textContent;
        if (node.nodeType !== 1) return "";

        const tag = node.tagName.toLowerCase();
        if (tag === "br") return "\n";

        let out = "";
        node.childNodes.forEach((child) => {
            const isBlock =
                child.nodeType === 1 && /^(p|div|li|tr|h[1-6])$/i.test(child.tagName);
            if (isBlock && out && !out.endsWith("\n")) out += "\n";
            out += textWithBreaks(child);
            if (isBlock && !out.endsWith("\n")) out += "\n";
        });
        return out;
    }

    /* ---------- field parsing ---------- */
    /* Detects "<strong>LABEL:</strong> value" at the start of a block.
       Tolerates the caret having typed inside the bold label. */
    function fieldOf(el) {
        if (!el || el.nodeType !== 1) return null;

        let first = el.firstChild;
        while (first && first.nodeType === 3 && !first.textContent.trim()) {
            first = first.nextSibling;
        }

        if (!first || first.nodeType !== 1) return null;

        const tag = first.tagName.toLowerCase();
        if (tag !== "strong" && tag !== "b") return null;

        const boldText = first.textContent || "";
        const colon = boldText.indexOf(":");
        if (colon < 1) return null;

        const label = flat(boldText.slice(0, colon));
        if (!label || label.length > 70 || /\n/.test(label)) return null;

        let rest = boldText.slice(colon + 1);
        let sibling = first.nextSibling;
        const holder = document.createElement("div");

        while (sibling) {
            holder.appendChild(sibling.cloneNode(true));
            sibling = sibling.nextSibling;
        }

        rest += textWithBreaks(holder);

        return { label: label.toUpperCase(), rawLabel: label, value: rest };
    }

    /* Returns [{label, value, raw, empty, section}] in document order. */
    function parseFields(source) {
        const root = typeof source === "string" ? toElement(source) : source;
        const out = [];

        let current = null;
        let section = "";

        Array.from(root.childNodes).forEach((node) => {
            if (node.nodeType === 3) {
                const text = node.textContent.trim();
                if (current && text) current.value += "\n" + text;
                return;
            }

            if (node.nodeType !== 1) return;

            const tag = node.tagName.toLowerCase();

            if (/^h[1-6]$/.test(tag)) {
                section = flat(node.textContent);
                current = null;
                return;
            }

            if (tag === "hr") {
                current = null;
                return;
            }

            const field = fieldOf(node);

            if (field) {
                current = {
                    label: field.label,
                    value: field.value,
                    section
                };
                out.push(current);
            } else if (current) {
                const text = textWithBreaks(node);
                if (flat(text)) current.value += "\n" + text;
            }
        });

        out.forEach((field) => {
            let raw = tidyLines(field.value);

            /* A template hint like "(e.g. 12/03/1990)" or
               "(Alive / Dead / Missing)" sits as the field's starting
               text so it's visible before typing. If the person typed
               without clearing it first, the real content ends up
               stuck right after the hint — strip that leading
               parenthetical so only what they actually wrote remains. */
            const withHint = raw.match(/^\(([^)]*)\)\s*(\S[\s\S]*)$/);
            const looksLikeHint =
                withHint && (/^(e\.?g\.?|example|calculated)/i.test(withHint[1].trim()) || /\//.test(withHint[1]));

            if (looksLikeHint) {
                raw = withHint[2].trim();
            }

            field.raw = raw;
            field.empty = isPlaceholder(field.raw.replace(/\n/g, " "));
            field.value = field.empty ? "" : field.raw;
        });

        return out;
    }

    function getField(fields, label) {
        const key = String(label || "").toUpperCase();
        const hit = fields.find((f) => f.label === key);
        return hit ? hit.value : "";
    }

    /* ---------- birthdate + age ---------- */
    function isRealDate(y, m, d) {
        const date = new Date(y, m - 1, d);
        return (
            date.getFullYear() === y &&
            date.getMonth() === m - 1 &&
            date.getDate() === d
        );
    }

    /* Tries to read one exact date out of a cleaned string. Returns a
       Date or null; never throws on garbage input. */
    function parseDOBExact(s) {
        s = s.replace(/(\d)(st|nd|rd|th)\b/gi, "$1").replace(/,/g, " ");
        if (/[A-Za-z]/.test(s)) s = s.replace(/[-\/.]/g, " ");
        s = s.replace(/\s+/g, " ").trim();

        let y;
        let m;
        let d;
        let match;

        if ((match = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/))) {
            y = +match[1];
            m = +match[2];
            d = +match[3];
        } else if ((match = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/))) {
            const a = +match[1];
            const b = +match[2];
            y = +match[3];

            if (a > 12) {
                d = a;
                m = b;
            } else if (b > 12) {
                m = a;
                d = b;
            } else {
                d = a;
                m = b;
            }
        } else if ((match = s.match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/))) {
            d = +match[1];
            const idx = MONTHS[match[2].toLowerCase()];
            if (idx === undefined) return null;
            m = idx + 1;
            y = +match[3];
        } else if ((match = s.match(/^([A-Za-z]+) (\d{1,2}) (\d{4})$/))) {
            const idx = MONTHS[match[1].toLowerCase()];
            if (idx === undefined) return null;
            m = idx + 1;
            d = +match[2];
            y = +match[3];
        } else {
            return null;
        }

        if (!isRealDate(y, m, d)) return null;
        return new Date(y, m - 1, d);
    }

    /* Date-shaped substrings to try if the whole field doesn't parse
       cleanly — covers leftover hint text or a trailing note sitting
       next to the real date instead of replacing it. */
    const DOB_SCAN_PATTERNS = [
        /\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}/g,
        /\d{1,2}[-\/.]\d{1,2}[-\/.]\d{4}/g,
        /\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4}/g,
        /[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/g
    ];

    /* Accepts 1990-03-12, 12/03/1990 (day first), 12 March 1990,
       March 12, 1990 and similar, tolerating stray hint/note text
       around the real date. Returns a Date or null. */
    function parseDOB(input) {
        const s = flat(input);
        if (!s || isPlaceholder(s)) return null;

        const exact = parseDOBExact(s);
        if (exact) return exact;

        /* Strip any "(...)" hint/note segments and retry whole-string. */
        const stripped = flat(s.replace(/\([^)]*\)/g, " "));
        if (stripped && stripped !== s) {
            const retry = parseDOBExact(stripped);
            if (retry) return retry;
        }

        /* Last resort: scan for a date-shaped substring anywhere in
           the text (handles hint text run directly into a typed date
           with no separator, or a trailing note after it). */
        for (const pattern of DOB_SCAN_PATTERNS) {
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(s))) {
                const found = parseDOBExact(match[0]);
                if (found) return found;
            }
        }

        return null;
    }

    /* Whole years between dob and today. null when unusable. */
    function calcAge(dob, now) {
        if (!(dob instanceof Date) || isNaN(dob)) return null;

        const today = now || new Date();
        if (dob > today) return null;

        let age = today.getFullYear() - dob.getFullYear();
        const beforeBirthday =
            today.getMonth() < dob.getMonth() ||
            (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());

        if (beforeBirthday) age -= 1;

        return age >= 0 && age <= 150 ? age : null;
    }

    /* ---------- relationships ---------- */
    /* delta = generation of the listed person minus the generation of
       the character whose profile lists them (family only). */
    const REL_RULES = [
        [/^(step|foster|adoptive)?[- ]?(mother|mom|mum|mama|father|dad|papa|parents?)\b/, { cat: "family", kind: "parent", delta: -1 }],
        [/(grandmother|grandfather|grandparents?|grandma|grandpa|granny)/, { cat: "family", kind: "grandparent", delta: -2 }],
        [/(grandchild|grandchildren|grandson|granddaughter)/, { cat: "family", kind: "grandchild", delta: 2 }],
        [/^(step|foster|adopted)?[- ]?(sons?|daughters?|child|children|kids?)\b/, { cat: "family", kind: "child", delta: 1 }],
        [/^(step|half)?[- ]?(brothers?|sisters?|siblings?|twin)\b/, { cat: "family", kind: "sibling", delta: 0 }],
        [/^(spouse|wife|wives|husband|husbands|married)\b/, { cat: "family", kind: "spouse", delta: 0 }],
        [/^(uncle|aunt|auntie)\b/, { cat: "family", kind: "pibling", delta: -1 }],
        [/^(nephews?|nieces?)\b/, { cat: "family", kind: "nibling", delta: 1 }],
        [/^cousins?\b/, { cat: "family", kind: "cousin", delta: 0 }],
        [/in-?law/, { cat: "family", kind: "inlaw", delta: null }],
        [/^(lover|love interest|girlfriend|boyfriend|fianc|betrothed|crush|ex\b|ex-|paramour|suitor|beloved)/, { cat: "romantic", kind: "romantic", delta: null }],
        [/^(enem|rival|nemesis|foe|antagonist|villain|arch)/, { cat: "enemy", kind: "enemy", delta: null }],
        [/^(mentor|teacher|master|apprentice|student|protege|liege|lord|sworn|boss|handler|commander|captain|leader|superior|patron)/, { cat: "mentor", kind: "mentor", delta: null }],
        [/^(friend|friends|best friend|ally|allies|confidant|companion|companions|partner|team|associates?|informants?|colleagues?|crew)/, { cat: "ally", kind: "ally", delta: null }]
    ];

    function classifyRelation(label) {
        const key = flat(label).toLowerCase();

        for (const [pattern, result] of REL_RULES) {
            if (pattern.test(key)) return { ...result };
        }

        return { cat: "other", kind: "other", delta: null };
    }

    /* "Aldric Vane (deceased), Mira & Tom" -> [{name, note}, ...] */
    function splitNames(value) {
        const text = String(value == null ? "" : value);
        const out = [];

        text
            .split(/[\n;,]+|\s+&\s+|\s+and\s+/i)
            .forEach((piece) => {
                let name = piece.trim();
                let note = "";

                const paren = name.match(/\(([^)]*)\)/);
                if (paren) {
                    note = flat(paren[1]);
                    name = name.replace(/\([^)]*\)/g, " ");
                }

                name = flat(name.replace(/^[-•*·\s]+/, ""));

                if (!name) return;
                if (/^(none|n\/a|na|nil|unknown|tbd|-|—)$/i.test(name)) return;

                out.push({ name, note });
            });

        return out;
    }

    function titleCase(value) {
        return flat(value).replace(/\b([a-z])/g, (m) => m.toUpperCase());
    }

    window.StoryUtils = {
        flat,
        tidyLines,
        normName,
        isPlaceholder,
        fieldOf,
        parseFields,
        getField,
        parseDOB,
        calcAge,
        classifyRelation,
        splitNames,
        titleCase,
        textWithBreaks
    };
})();
