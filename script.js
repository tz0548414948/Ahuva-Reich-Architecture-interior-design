/* =========================================================
   MOBILE MENU
========================================================= */

const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
const mobileLinks = document.querySelectorAll(".mobile-menu a");


if (menuToggle && mobileMenu) {

    menuToggle.addEventListener("click", () => {

        const isOpen =
            menuToggle.classList.toggle("open");

        mobileMenu.classList.toggle(
            "open",
            isOpen
        );

        document.body.classList.toggle(
            "menu-open",
            isOpen
        );

        menuToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

    });


    /* =====================================================
       CLOSE MENU AFTER CLICKING A LINK
    ===================================================== */

    mobileLinks.forEach(link => {

        link.addEventListener("click", () => {

            menuToggle.classList.remove("open");

            mobileMenu.classList.remove("open");

            document.body.classList.remove(
                "menu-open"
            );

            menuToggle.setAttribute(
                "aria-expanded",
                "false"
            );

        });

    });

}


/* =========================================================
   HEADER SHADOW
========================================================= */

const header =
    document.querySelector(".site-header");


if (header) {

    const updateHeader = () => {

        if (window.scrollY > 20) {

            header.style.boxShadow =
                "0 8px 30px rgba(40, 30, 20, 0.07)";

        } else {

            header.style.boxShadow =
                "none";

        }

    };


    window.addEventListener(
        "scroll",
        updateHeader,
        { passive: true }
    );

    updateHeader();

}


/* =========================================================
   ACTIVE DESKTOP NAVIGATION
========================================================= */

const sections =
    document.querySelectorAll(
        "main section[id]"
    );

const navLinks =
    document.querySelectorAll(
        ".desktop-nav .nav-link"
    );


if (
    sections.length &&
    navLinks.length &&
    "IntersectionObserver" in window
) {

    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(entry => {

                    if (!entry.isIntersecting) {
                        return;
                    }


                    navLinks.forEach(link => {
                        link.classList.remove("active");
                    });


                    const activeLink =
                        document.querySelector(
                            `.desktop-nav a[href="#${entry.target.id}"]`
                        );


                    if (activeLink) {

                        activeLink.classList.add(
                            "active"
                        );

                    }

                });

            },
            {
                rootMargin:
                    "-35% 0px -55% 0px"
            }
        );


    sections.forEach(section => {
        observer.observe(section);
    });

}

/* =========================================================
   PROJECTS CAROUSEL

   Reads window.PROJECTS_DATA (defined in projects-data.js —
   the single file where all project images/text live) and
   renders it into the track. Nothing about a project's image,
   tag or title is hard-coded here.
========================================================= */

const projectsTrack = document.getElementById("projects-track");
const carouselPrev = document.getElementById("carousel-prev");
const carouselNext = document.getElementById("carousel-next");
const carouselDots = document.getElementById("carousel-dots");

let currentLang = "he";

/* Every value below can come from an external, editable source (the
   Google Sheet) rather than from this codebase, so none of it is
   trusted. Text goes through escapeHTML before it ever reaches
   innerHTML, and image URLs are restricted to http(s)/data:image
   and never written into an HTML attribute string — they're applied
   through the style *property* in applyProjectImages() below, which
   goes through CSS parsing, not the HTML parser, so it can't be used
   to inject markup or scripts. */

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[ch]));

}

function isSafeImageURL(url) {

    if (typeof url !== "string") {
        return false;
    }

    const trimmed = url.trim();

    return /^https:\/\//i.test(trimmed)
        || /^http:\/\//i.test(trimmed)
        || /^data:image\//i.test(trimmed);

}

function projectPhotos(project) {

    let photos = [];

    if (Array.isArray(project.images) && project.images.length > 0) {
        photos = project.images;
    } else if (project.image) {
        photos = [project.image];
    }

    return photos.filter(isSafeImageURL);

}

function projectCardHTML(project, lang) {

    const tag = escapeHTML(project.tag[lang] || project.tag.he || "");
    const title = escapeHTML(project.title[lang] || project.title.he || "");
    const photos = projectPhotos(project);

    const photosHTML = photos
        .map((src, i) => `<div class="project-image${i === 0 ? " active" : ""}" data-src="${escapeHTML(src)}" data-photo-index="${i}"></div>`)
        .join("");

    const galleryControls = photos.length > 1
        ? `
            <button type="button" class="photo-nav photo-prev" aria-label="תמונה קודמת">‹</button>
            <button type="button" class="photo-nav photo-next" aria-label="תמונה הבאה">›</button>
            <div class="photo-count"><span class="photo-count-current">1</span> / ${photos.length}</div>
        `
        : "";

    return `
        <article class="project">
            <div class="project-images" data-index="0">
                ${photosHTML}
                ${galleryControls}
            </div>
            <div class="project-info">
                <span>${tag}</span>
                <h3>${title}</h3>
            </div>
        </article>
    `;

}

/* Reads back the data-src attributes written above and applies them
   as real background images via the CSSOM (element.style.*), never
   by re-injecting a string into innerHTML. */
function applyProjectImages() {

    projectsTrack.querySelectorAll(".project-image[data-src]").forEach(el => {
        el.style.backgroundImage = `url("${el.dataset.src}")`;
    });

}

/* =========================================================
   MINI GALLERY AUTOPLAY

   Each project with more than one photo cycles to its next
   photo every few seconds on its own — a small clock per card,
   not tied to the main project-to-project carousel. Hovering a
   card (or touching it) pauses just that card's clock; moving
   away resumes it. Re-rendering (language toggle, a Sheets
   refresh) clears the old clocks first so they never pile up.
========================================================= */

const GALLERY_AUTOPLAY_MS = 4000;
const galleryTimers = new WeakMap();

function setGalleryIndex(gallery, index) {

    const photos = gallery.querySelectorAll(".project-image");

    if (photos.length === 0) {
        return;
    }

    const normalized = ((index % photos.length) + photos.length) % photos.length;

    photos.forEach((photo, i) => {
        photo.classList.toggle("active", i === normalized);
    });

    const counter = gallery.querySelector(".photo-count-current");
    if (counter) {
        counter.textContent = String(normalized + 1);
    }

    gallery.dataset.index = String(normalized);

}

function stopGalleryAutoplay(gallery) {

    const timer = galleryTimers.get(gallery);

    if (timer) {
        window.clearInterval(timer);
        galleryTimers.delete(gallery);
    }

}

function startGalleryAutoplay(gallery) {

    const photos = gallery.querySelectorAll(".project-image");

    if (photos.length < 2) {
        return;
    }

    stopGalleryAutoplay(gallery);

    const timer = window.setInterval(() => {
        const current = Number(gallery.dataset.index) || 0;
        setGalleryIndex(gallery, current + 1);
    }, GALLERY_AUTOPLAY_MS);

    galleryTimers.set(gallery, timer);

}

function restartGalleryAutoplay(gallery) {
    startGalleryAutoplay(gallery);
}

function initGalleryAutoplay() {

    projectsTrack.querySelectorAll(".project-images").forEach(gallery => {

        startGalleryAutoplay(gallery);

        gallery.addEventListener("mouseenter", () => stopGalleryAutoplay(gallery));
        gallery.addEventListener("mouseleave", () => startGalleryAutoplay(gallery));

        /* Touch devices have no hover — pause briefly around a tap
           so a finger on the photo doesn't fight the auto-advance. */
        gallery.addEventListener("touchstart", () => stopGalleryAutoplay(gallery), { passive: true });
        gallery.addEventListener("touchend", () => startGalleryAutoplay(gallery), { passive: true });

    });

}

function renderProjects(lang) {

    if (!projectsTrack || !Array.isArray(window.PROJECTS_DATA)) {
        return;
    }

    /* Clear timers from the previous render before the old .project-images
       elements are thrown away — otherwise their intervals keep firing
       against detached elements forever (a silent memory/CPU leak). */
    projectsTrack.querySelectorAll(".project-images").forEach(stopGalleryAutoplay);

    projectsTrack.innerHTML = window.PROJECTS_DATA
        .map(project => projectCardHTML(project, lang))
        .join("");

    applyProjectImages();
    initGalleryAutoplay();

    if (carouselDots) {

        carouselDots.innerHTML = window.PROJECTS_DATA
            .map((_, i) => `<button type="button" class="carousel-dot${i === 0 ? " active" : ""}" data-index="${i}" aria-label="פרויקט ${i + 1}"></button>`)
            .join("");

    }

    updateCarouselState();

}

/* =========================================================
   GOOGLE SHEETS SOURCE (optional)

   If window.PROJECTS_SHEET_CSV_URL is set in projects-data.js,
   the projects are loaded live from that published Google Sheet
   instead of the static window.PROJECTS_DATA array below it.
   This lets a non-technical person manage the project photos
   from a spreadsheet, with no access to this codebase at all.

   Expected header row in the sheet (in any column order):
   image | tag_he | tag_en | title_he | title_en

   If the URL is empty, missing, or the fetch fails for any
   reason (offline, sheet unpublished, typo in the link), the
   site quietly falls back to the static window.PROJECTS_DATA
   array so nothing ever breaks.
========================================================= */

function parseCSV(text) {

    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {

        const char = text[i];
        const next = text[i + 1];

        if (inQuotes) {

            if (char === '"' && next === '"') {
                field += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                field += char;
            }

        } else {

            if (char === '"') {
                inQuotes = true;
            } else if (char === ",") {
                row.push(field);
                field = "";
            } else if (char === "\n" || char === "\r") {
                if (char === "\r" && next === "\n") {
                    i++;
                }
                row.push(field);
                rows.push(row);
                row = [];
                field = "";
            } else {
                field += char;
            }

        }

    }

    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter(r => r.some(cell => cell.trim() !== ""));

}

function projectsFromCSV(text) {

    const rows = parseCSV(text);

    if (rows.length < 2) {
        return null;
    }

    const header = rows[0].map(h => h.trim().toLowerCase());
    const col = name => header.indexOf(name);

    const idx = {
        image: col("image"),
        tagHe: col("tag_he"),
        tagEn: col("tag_en"),
        titleHe: col("title_he"),
        titleEn: col("title_en"),
    };

    if (idx.image === -1 || idx.titleHe === -1) {
        console.warn("Google Sheet CSV is missing required columns (image, title_he) — falling back to the static project list.");
        return null;
    }

    return rows.slice(1)
        .filter(r => (r[idx.image] || "").trim() !== "")
        .map(r => ({
            /* One photo, or several of the same job separated by "|"
               in the same cell (e.g. "url1 | url2 | url3"). */
            images: (r[idx.image] || "")
                .split("|")
                .map(s => s.trim())
                .filter(Boolean),
            tag: {
                he: (r[idx.tagHe] || "").trim(),
                en: (r[idx.tagEn] || "").trim(),
            },
            title: {
                he: (r[idx.titleHe] || "").trim(),
                en: (r[idx.titleEn] || "").trim(),
            },
        }));

}

async function loadProjectsFromSheet() {

    const url = window.PROJECTS_SHEET_CSV_URL;

    if (!url || typeof url !== "string" || url.trim() === "") {
        return;
    }

    try {

        const response = await fetch(url, { cache: "no-store" });

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const text = await response.text();
        const parsed = projectsFromCSV(text);

        if (parsed && parsed.length > 0) {
            window.PROJECTS_DATA = parsed;
        }

    } catch (err) {
        console.warn("Could not load projects from the Google Sheet, using the built-in project list instead.", err);
    }

}
function testimonialsFromCSV(text) {

    const rows = parseCSV(text);
    if (rows.length < 2) return null;

    /* לא מסתמכים על שם הכותרת בשורה 1 — גוגל פורמס מאפס אותה
       בחזרה לטקסט השאלה בכל פעם שהטופס מתעדכן. מסתמכים על
       המיקום הקבוע: A=חותמת זמן, B=שם, C=תוכן, D=דירוג, E=approved */
    const header = rows[0].map(h => h.trim().toLowerCase());
    const approvedIdx = header.indexOf("approved") !== -1 ? header.indexOf("approved") : 4;

    const list = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every(cell => !cell || !cell.trim())) continue;

        const approvedRaw = (row[approvedIdx] || "").trim().toLowerCase();
        if (!["כן", "yes", "true", "1"].includes(approvedRaw)) continue;

        const name = (row[1] || "").trim();
        const text = (row[2] || "").trim();
        if (!name || !text) continue;

        let rating = parseInt(row[3], 10);
        if (!Number.isFinite(rating)) rating = 0;
        rating = Math.max(0, Math.min(5, rating));

        list.push({ name, text, rating });
    }
    return list;

}

async function loadTestimonialsFromSheet() {

    const url = window.TESTIMONIALS_SHEET_CSV_URL;
    if (!url || typeof url !== "string" || url.trim() === "") {
        return;
    }

    try {

        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const parsed = testimonialsFromCSV(await response.text());

        if (parsed && parsed.length > 0) {
            window.TESTIMONIALS_DATA = parsed;
            renderTestimonials();
        }

    } catch (err) {
        console.warn("Could not load testimonials from the Google Sheet.", err);
    }

}

function renderTestimonials() {

    const grid = document.getElementById("testimonialsGrid");
    if (!grid) return;

    const section = grid.closest(".testimonials");
    const list = window.TESTIMONIALS_DATA || [];

    if (!list.length) {
        if (section) section.style.display = "none";
        return;
    }
    if (section) section.style.display = "";

    grid.innerHTML = list.map(t => {
        const stars = "★".repeat(t.rating) + "☆".repeat(5 - t.rating);
        return `
            <div class="testimonial-card">
                ${t.rating ? `<div class="testimonial-stars">${stars}</div>` : ""}
                <p class="testimonial-text">"${escapeHTML(t.text)}"</p>
                <strong class="testimonial-name">${escapeHTML(t.name)}</strong>
            </div>
        `;
    }).join("");

}

function getCardStep() {

    const card = projectsTrack.querySelector(".project");

    if (!card) {
        return 0;
    }

    const style = window.getComputedStyle(projectsTrack);
    const gap = parseFloat(style.columnGap || style.gap || "0") || 0;

    return card.getBoundingClientRect().width + gap;

}

function updateCarouselState() {

    if (!projectsTrack) {
        return;
    }

    const maxScroll = projectsTrack.scrollWidth - projectsTrack.clientWidth;
    const atStart = projectsTrack.scrollLeft <= 2;
    const atEnd = projectsTrack.scrollLeft >= maxScroll - 2;

    if (carouselPrev) {
        carouselPrev.disabled = atStart;
    }

    if (carouselNext) {
        carouselNext.disabled = atEnd || maxScroll <= 0;
    }

    if (carouselDots) {

        const step = getCardStep();

        if (step > 0) {

            const activeIndex = Math.round(projectsTrack.scrollLeft / step);

            carouselDots.querySelectorAll(".carousel-dot").forEach((dot, i) => {
                dot.classList.toggle("active", i === activeIndex);
            });

        }

    }

}

if (projectsTrack) {

    renderProjects(currentLang);

    loadProjectsFromSheet().then(() => {
        renderProjects(currentLang);
    });
   renderTestimonials();
loadTestimonialsFromSheet();

    if (carouselPrev) {

        carouselPrev.addEventListener("click", () => {
            projectsTrack.scrollBy({ left: -getCardStep(), behavior: "smooth" });
        });

    }

    if (carouselNext) {

        carouselNext.addEventListener("click", () => {
            projectsTrack.scrollBy({ left: getCardStep(), behavior: "smooth" });
        });

    }

    if (carouselDots) {

        carouselDots.addEventListener("click", event => {

            const dot = event.target.closest(".carousel-dot");

            if (!dot) {
                return;
            }

            const index = Number(dot.dataset.index);
            projectsTrack.scrollTo({ left: index * getCardStep(), behavior: "smooth" });

        });

    }

    projectsTrack.addEventListener("scroll", () => {
        window.requestAnimationFrame(updateCarouselState);
    }, { passive: true });

    window.addEventListener("resize", () => {
        window.requestAnimationFrame(updateCarouselState);
    });

    /* Per-project mini photo gallery — lets one project card cycle
       through several photos (e.g. multiple angles of the same job)
       without affecting the main project-to-project carousel. */
    projectsTrack.addEventListener("click", event => {

        const navBtn = event.target.closest(".photo-nav");

        if (!navBtn) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const gallery = navBtn.closest(".project-images");
        const photos = gallery.querySelectorAll(".project-image");

        if (photos.length < 2) {
            return;
        }

        let index = Number(gallery.dataset.index) || 0;
        index = navBtn.classList.contains("photo-next")
            ? (index + 1) % photos.length
            : (index - 1 + photos.length) % photos.length;

        setGalleryIndex(gallery, index);

        /* A manual click restarts that gallery's own timer, so it
           doesn't jump again right after the visitor just chose a
           photo. */
        restartGalleryAutoplay(gallery);

    });

}


/* =========================================================
   LANGUAGE TOGGLE (Hebrew / English)

   Every translatable element carries either:
     - data-i18n="key"       -> plain text swap (textContent)
     - data-i18n-html="key"  -> markup swap (innerHTML), used
       only where the Hebrew original contains inline tags
       (<br>, <em>, <span>) that the English copy must keep.

   Hebrew text lives in the HTML as written by the designer;
   this dictionary supplies the English side only, plus the
   Hebrew is captured once at load time so the toggle can
   switch back and forth without re-fetching anything.
========================================================= */

const translations = {

    "nav.home": { en: "Home" },
    "nav.about": { en: "About" },
    "nav.services": { en: "Services" },
    "nav.projects": { en: "Projects" },
    "nav.contact": { en: "Contact" },

    "lang.toggle": { en: "עב" },

    "hero.eyebrow": { en: "Architecture · Interior Design · Guidance" },
    "hero.title": {
        en: 'Your home.<br>Exactly as <span>you imagined it.</span>'
    },
    "hero.text": {
        en: "Bespoke planning and interior design, from the first idea to the smallest detail."
    },
    "hero.cta1": { en: "View Projects" },
    "hero.cta2": { en: "Let's Talk" },

    "intro.label": { en: "01 / About Us" },
    "intro.title": {
        en: 'Design born <em>from real life.</em>'
    },
    "intro.text": {
        en: "Every home tells its own story. My role is to understand the people who live in it, their needs and the way they want to live — and translate all of that into a space that is precise, pleasant and unique."
    },
    "intro.link": { en: "Get to know me" },

    "services.label": { en: "02 / Services" },
    "services.title": {
        en: 'From initial planning<br>to the perfect home.'
    },
    "services.text": { en: "Personal, professional guidance every step of the way." },

    "services.s1.title": { en: "Interior Design" },
    "services.s1.text": {
        en: "Creating a complete design language — materials, colors, lighting, furniture and finishing details."
    },
    "services.s2.title": { en: "Home Planning" },
    "services.s2.text": {
        en: "Thoughtful space planning — room layout, flow, functionality and fit to your lifestyle."
    },
    "services.s3.title": { en: "Renovation Guidance" },
    "services.s3.text": {
        en: "Professional guidance through construction — coordinating contractors, materials and decisions."
    },
    "services.s4.title": { en: "Private Projects" },
    "services.s4.text": {
        en: "Planning and design of private homes and apartments, fully tailored to people and budget."
    },

    "about.badge": { en: "Interior Design" },
    "about.label": { en: "03 / About" },
    "about.title": {
        en: 'Precise planning.<br>Design with character.'
    },
    "about.text1": {
        en: "I'm Ahuva Reich, an architect and interior designer specializing in planning and designing private homes and apartments."
    },
    "about.text2": {
        en: "My process starts with listening. I believe good design shouldn't just look beautiful — it should work for you, every single day."
    },
    "about.d1.label": { en: "Service Area" },
    "about.d1.value": { en: "Jerusalem & Central Israel" },
    "about.d2.label": { en: "Specialty" },
    "about.d2.value": { en: "Private homes & apartments" },

    "projects.label": { en: "04 / Projects" },
    "projects.title": {
        en: 'Spaces with<br>character of their own.'
    },

    "process.label": { en: "05 / The Process" },
    "process.title": {
        en: 'Simple. Clear.<br>Personal.'
    },
    "process.s1.title": { en: "Introductory Meeting" },
    "process.s1.text": { en: "Understanding your needs, wishes and vision." },
    "process.s2.title": { en: "Concept Development" },
    "process.s2.text": { en: "Developing a concept, plans and materials." },
    "process.s3.title": { en: "Design Development" },
    "process.s3.text": { en: "Building a precise, harmonious design language." },
    "process.s4.title": { en: "Execution Support" },
    "process.s4.text": { en: "Continuing together until the home is ready." },

    "contact.label": { en: "06 / Get Started" },
    "contact.title": {
        en: 'Have a home<br><em>to imagine?</em>'
    },
    "contact.text": {
        en: "I'd love to hear about your project and explore together how to turn the idea into a home you truly want to live in."
    },
    "contact.cta": { en: "Let's Talk on WhatsApp" },
    "contact.email.label": { en: "Or email me at:" },

    "footer.tagline": { en: "Interior Design · Planning · Guidance" },
   "footer.rights": { en: "All rights reserved" },

"testimonials.label": { en: "Testimonials" },
"testimonials.title": { en: "In Their Own Words" }
};

const PAGE_META = {
    he: {
        title: "אהובה רייך | אדריכלית ומעצבת פנים",
        description: "אהובה רייך — אדריכלית ומעצבת פנים. תכנון אדריכלי, עיצוב פנים וליווי מלא של בתים פרטיים, דירות ופרויקטים בוטיק בירושלים ובמרכז, מהרעיון הראשון ועד למסירת המפתח."
    },
    en: {
        title: "Ahuva Reich | Architecture & Interior Design",
        description: "Ahuva Reich — architect and interior designer. Architectural planning, interior design and full guidance for private homes and apartments in Jerusalem and Central Israel, from first idea to the finished home."
    }
};

(function initLanguageToggle() {

    const htmlRoot = document.getElementById("html-root");

    if (!htmlRoot) {
        return;
    }

    const STORAGE_KEY = "ahuva-reich-lang";

    const textEls = document.querySelectorAll("[data-i18n]");
    const htmlEls = document.querySelectorAll("[data-i18n-html]");

    // Capture the original Hebrew content once, so switching
    // back to Hebrew never depends on re-fetching or re-parsing.
    textEls.forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (translations[key] && !translations[key].he) {
            translations[key].he = el.textContent.trim();
        }
    });

    htmlEls.forEach(el => {
        const key = el.getAttribute("data-i18n-html");
        if (translations[key] && !translations[key].he) {
            translations[key].he = el.innerHTML.trim();
        }
    });

    function applyLanguage(lang) {

        textEls.forEach(el => {
            const key = el.getAttribute("data-i18n");
            const entry = translations[key];
            if (entry) {
                el.textContent = lang === "en" ? entry.en : entry.he;
            }
        });

        htmlEls.forEach(el => {
            const key = el.getAttribute("data-i18n-html");
            const entry = translations[key];
            if (entry) {
                el.innerHTML = lang === "en" ? entry.en : entry.he;
            }
        });

        htmlRoot.setAttribute("lang", lang);
        htmlRoot.setAttribute("dir", lang === "en" ? "ltr" : "rtl");

        document.body.classList.toggle("lang-en", lang === "en");

        currentLang = lang;
        renderProjects(lang);

        const meta = PAGE_META[lang];
        if (meta) {
            document.title = meta.title;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
                metaDesc.setAttribute("content", meta.description);
            }
        }

        try {
            localStorage.setItem(STORAGE_KEY, lang);
        } catch (err) {
            /* storage unavailable — language just won't persist */
        }

    }

    function toggleLanguage() {
        const current = htmlRoot.getAttribute("lang") === "en" ? "en" : "he";
        applyLanguage(current === "en" ? "he" : "en");
    }

    const toggleBtn = document.getElementById("lang-toggle");
    const toggleBtnMobile = document.getElementById("lang-toggle-mobile");

    if (toggleBtn) {
        toggleBtn.addEventListener("click", toggleLanguage);
    }

    if (toggleBtnMobile) {
        toggleBtnMobile.addEventListener("click", toggleLanguage);
    }

    let savedLang = null;
    try {
        savedLang = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
        /* storage unavailable — default to Hebrew */
    }

    if (savedLang === "en") {
        applyLanguage("en");
    }

})();
