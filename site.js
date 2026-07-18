let projects = [];
let site = {};

const fallbackSite = {
  name: "Manvir Khangura",
  metaDescription: "manvir.art portfolio by Manvir Khangura.",
  kicker: "Visual Archive",
  headline: "Manvir Khangura",
  description: "Marketing/Creative",
  linkedinUrl: "https://www.linkedin.com/in/manvir-khangura",
  instagramUrl: "https://www.instagram.com/manvir.s_/",
  services: ["Marketing", "Creative", "Photography"],
  contactHeading: "Available for marketing, creative direction, photography, and culture-driven content.",
};

const fallbackProjects = [
  {
    slug: "projects",
    title: "Projects",
    year: 2026,
    category: "work",
    description: "Selected marketing, creative, and visual direction projects.",
    cover: "sample/personal-02.svg",
    images: ["sample/personal-02.svg", "sample/event-01.svg", "sample/event-02.svg"],
    published: true,
    featured: true,
  },
  {
    slug: "photography",
    title: "Photography",
    year: 2026,
    category: "photography",
    description: "A collection of polaroids I have taken over the years. SX-70 and OneStep2.",
    cover: "sample/portrait-01.svg",
    images: ["sample/portrait-01.svg", "sample/portrait-02.svg"],
    published: true,
    featured: true,
  },
];

const views = {
  home: document.querySelectorAll('[data-view="home"]'),
  archive: document.querySelector('[data-view="archive"]'),
  project: document.querySelector('[data-view="project"]'),
  contact: document.querySelector('[data-view="contact"]'),
};

const featuredGrid = document.querySelector("#featured-grid");
const archiveGrid = document.querySelector("#archive-grid");
const archiveTitle = document.querySelector("#archive-title");
const archiveEmpty = document.querySelector("#archive-empty");
const projectBack = document.querySelector("#project-back");
const projectType = document.querySelector("#project-type");
const projectTitle = document.querySelector("#project-title");
const projectDescription = document.querySelector("#project-description");
const projectImages = document.querySelector("#project-images");
const themeToggle = document.querySelector("#theme-toggle");
const controlsToggle = document.querySelector("#controls-toggle");
const siteControls = document.querySelector("#site-controls");

const atmosphere = {
  canvas: document.querySelector("#atmosphere"),
  context: null,
  cell: 12,
  brush: "soft",
  pointerX: 0.5,
  pointerY: 0.5,
  pointerPx: window.innerWidth * 0.5,
  pointerPy: window.innerHeight * 0.5,
  lastPointerPx: window.innerWidth * 0.5,
  lastPointerPy: window.innerHeight * 0.5,
  time: 0,
};

init();

async function init() {
  setupTheme();
  setupAtmosphere();
  setupControlBoard();

  let projectData = { projects: fallbackProjects };
  site = fallbackSite;

  try {
    const [projectResponse, siteResponse] = await Promise.all([
      fetch("content/projects-v2.json", { cache: "no-store" }),
      fetch("content/site-v2.json", { cache: "no-store" }),
    ]);
    if (projectResponse.ok && siteResponse.ok) {
      projectData = await projectResponse.json();
      site = await siteResponse.json();
    }
  } catch {
    projectData = { projects: fallbackProjects };
    site = fallbackSite;
  }

  projects = projectData.projects
    .filter((project) => project.published !== false)
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || Number(b.year) - Number(a.year));

  await mergeUploadedImages();

  renderSite(site);
  renderProjectList(featuredGrid, projects);
  window.addEventListener("hashchange", route);
  route();
}

function setupTheme() {
  const savedTheme = localStorage.getItem("manvir-theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(savedTheme || (prefersDark ? "dark" : "light"));

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      setTheme(nextTheme);
      localStorage.setItem("manvir-theme", nextTheme);
    });
  }
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  if (!themeToggle) return;
  const isDark = theme === "dark";
  themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
  themeToggle.dataset.mode = isDark ? "dark" : "light";
}

async function mergeUploadedImages() {
  const config = window.PORTFOLIO_ADMIN_CONFIG || {};
  const isConfigured =
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    !config.supabaseUrl.includes("YOUR_PROJECT_ID") &&
    !config.supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY");

  if (!isConfigured) return;

  try {
    const endpoint = `${config.supabaseUrl}/rest/v1/portfolio_images?select=gallery_slug,image_url,caption,created_at&order=created_at.desc`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${config.supabaseAnonKey}`,
      },
    });
    if (!response.ok) return;

    const uploadedImages = await response.json();
    for (const project of projects) {
      const galleryImages = uploadedImages
        .filter((imageRecord) => imageRecord.gallery_slug === project.slug)
        .map((imageRecord) => imageRecord.image_url)
        .filter(Boolean);

      if (galleryImages.length) {
        project.images = galleryImages.concat(project.images || []);
        project.cover = galleryImages[0];
      }
    }
  } catch {
    // Keep the static portfolio working if Supabase is unreachable.
  }
}

function renderSite(data) {
  document.title = data.name || "manvir.art";
  setText("[data-site='name']", data.name);
  setText("[data-site='kicker']", data.kicker);
  setText("[data-site='headline']", data.headline || data.name);
  setText("[data-site='description']", data.description);
  setText("[data-site='contactHeading']", data.contactHeading);

  const metaDescription = document.querySelector("[data-site='metaDescription']");
  if (metaDescription && data.metaDescription) {
    metaDescription.setAttribute("content", data.metaDescription);
  }

  renderLinks(document.querySelector("[data-site='heroLinks']"), data, { iconsOnly: true });
  renderLinks(document.querySelector("[data-site='contactLinks']"), data, { fullServices: true });
}

function setText(selector, value) {
  if (!value) return;
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = value;
  });
}

function renderLinks(container, data, options = {}) {
  if (!container) return;
  const nodes = [];
  if (data.linkedinUrl) nodes.push(textLink("LinkedIn", data.linkedinUrl, options.iconsOnly));
  if (data.instagramUrl) nodes.push(textLink("Instagram", data.instagramUrl, options.iconsOnly));

  if (!options.iconsOnly) {
    const services = Array.isArray(data.services) ? data.services : [];
    const shownServices = options.fullServices ? services : services.slice(0, 2);
    for (const service of shownServices) {
      const span = document.createElement("span");
      span.textContent = service;
      nodes.push(span);
    }
  }

  container.replaceChildren(...nodes);
}

function textLink(label, href, iconOnly = false) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.setAttribute("aria-label", label);
  if (iconOnly) {
    link.className = "social-icon";
    link.innerHTML = socialIcon(label);
  } else {
    link.textContent = label;
  }
  return link;
}

function socialIcon(label) {
  if (label === "LinkedIn") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.1 8.8h3.3v10.7H5.1V8.8Zm.2-3.2c0-1 .8-1.7 1.7-1.7 1 0 1.7.7 1.7 1.7S8 7.3 7 7.3c-.9 0-1.7-.7-1.7-1.7Zm5.1 3.2h3.1v1.5h.1c.4-.8 1.5-1.7 3.1-1.7 3.3 0 3.9 2.2 3.9 5v5.9h-3.3v-5.2c0-1.2 0-2.8-1.7-2.8s-1.9 1.3-1.9 2.7v5.3h-3.3V8.8Z"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Zm0 2.2A1.8 1.8 0 0 0 6.2 8v8A1.8 1.8 0 0 0 8 17.8h8a1.8 1.8 0 0 0 1.8-1.8V8A1.8 1.8 0 0 0 16 6.2H8Zm4 3.1a2.7 2.7 0 1 1 0 5.4 2.7 2.7 0 0 1 0-5.4Zm0 2.1a.6.6 0 1 0 0 1.2.6.6 0 0 0 0-1.2Zm3.2-2.8a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z"/></svg>`;
}

function route() {
  const raw = window.location.hash.replace(/^#\/?/, "") || "home";
  let [first, second] = raw.split("/");
  if (second === "professional-work" || second === "safal") second = "projects";

  setActive(first === "project" || first === "section" ? second || "galleries" : first);

  if (first === "contact") {
    showOnly("contact");
    return;
  }

  if ((first === "project" || first === "section") && second) {
    renderProject(second);
    return;
  }

  if (first === "galleries") {
    renderArchive();
    return;
  }

  showOnly("home");
}

function showOnly(view) {
  views.home.forEach((element) => {
    element.hidden = view !== "home";
  });
  views.archive.hidden = view !== "archive";
  views.project.hidden = view !== "project";
  views.contact.hidden = view !== "contact";
}

function renderArchive() {
  archiveTitle.textContent = "Sections";
  archiveEmpty.hidden = projects.length > 0;
  renderProjectList(archiveGrid, projects);
  showOnly("archive");
}

function renderProject(slug) {
  const project = projects.find((item) => item.slug === slug);
  if (!project) {
    window.location.hash = "#home";
    return;
  }

  const isPhotography = project.slug === "photography" || project.category === "photography";
  projectBack.href = "#home";
  projectBack.textContent = "Back home";
  const images = Array.isArray(project.images) && project.images.length ? project.images : [project.cover];
  const frameCount = images.filter(Boolean).length;
  projectType.textContent = `${project.category || "gallery"} / ${project.year || "now"} / ${frameCount} ${frameCount === 1 ? "frame" : "frames"}`;
  projectTitle.textContent = project.title;
  views.project.classList.toggle("is-photography", isPhotography);
  renderProjectDescription(project.description || "", isPhotography);
  projectImages.className = isPhotography ? "photo-marquee" : "image-stack";
  projectImages.replaceChildren(
    ...(isPhotography ? [photographyMarquee(images.filter(Boolean))] : images.filter(Boolean).map((src, index) => galleryImage(src, index)))
  );
  showOnly("project");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function renderProjectDescription(description, isPhotography = false) {
  if (!isPhotography) {
    projectDescription.textContent = description;
    return;
  }

  const [mainText, cameraText] = description.split(". SX-70");
  const mainLine = document.createElement("span");
  mainLine.textContent = `${mainText}.`;

  const cameraLine = document.createElement("span");
  cameraLine.className = "camera-line";
  cameraLine.textContent = cameraText === undefined ? "SX-70 and OneStep2." : `SX-70${cameraText}`;

  projectDescription.replaceChildren(mainLine, cameraLine);
}

function renderProjectList(container, items) {
  container.replaceChildren(...items.map((project, index) => projectRow(project, index)));
}

function projectRow(project, index) {
  const link = document.createElement("a");
  link.className = "project-row";
  link.href = `#project/${project.slug}`;
  link.style.setProperty("--row-index", index);

  const number = document.createElement("span");
  number.className = "project-number";
  number.textContent = String(index + 1).padStart(2, "0");

  const title = document.createElement("span");
  title.className = "project-row-title";
  title.textContent = project.title;

  const media = document.createElement("span");
  media.className = "project-row-media";
  if (project.cover) {
    media.append(galleryImage(project.cover, index));
  }

  const type = document.createElement("span");
  type.className = "project-row-type";
  type.textContent = project.category === "photography" ? "Photo set" : "Work";

  link.append(number, title, media, type);
  return link;
}

function galleryImage(src, index = 0) {
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.loading = index < 2 ? "eager" : "lazy";
  img.decoding = "async";
  return img;
}

function photographyMarquee(sourceImages) {
  const fallbackImages = ["sample/portrait-01.svg", "sample/portrait-02.svg", "sample/personal-01.svg", "sample/event-01.svg"];
  const usableImages = sourceImages.length ? sourceImages : fallbackImages;
  const cardCount = Math.max(9, usableImages.length * 2);
  const stage = document.createElement("div");
  stage.className = "polaroid-stage";

  const lanes = [
    { className: "polaroid-lane lane-slow", count: cardCount },
    { className: "polaroid-lane lane-fast", count: cardCount },
    { className: "polaroid-lane lane-drift", count: cardCount },
  ];

  lanes.forEach((lane, laneIndex) => {
    const laneElement = document.createElement("div");
    laneElement.className = lane.className;
    laneElement.setAttribute("aria-hidden", "true");

    for (let index = 0; index < lane.count; index += 1) {
      const src = usableImages[(index + laneIndex) % usableImages.length];
      laneElement.append(polaroidCard(src, index, laneIndex));
    }

    stage.append(laneElement);
  });

  return stage;
}

function polaroidCard(src, index, laneIndex) {
  const rotations = [-8, 5, -3, 9, -11, 4, 7, -5, 2];
  const figure = document.createElement("figure");
  figure.className = "polaroid-card";
  figure.style.setProperty("--r", `${rotations[(index + laneIndex * 2) % rotations.length]}deg`);
  figure.style.setProperty("--shift", `${((index + laneIndex) % 3) * 18}px`);

  const img = galleryImage(src, index);
  const caption = document.createElement("figcaption");
  caption.textContent = laneIndex === 1 && index % 4 === 1 ? "manvir.art" : "SX-70";

  figure.append(img, caption);
  return figure;
}

function setActive(routeName) {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === routeName);
  });
}

function setupControlBoard() {
  if (controlsToggle && siteControls) {
    controlsToggle.addEventListener("click", () => {
      const isOpening = siteControls.hidden;
      siteControls.hidden = !isOpening;
      controlsToggle.classList.toggle("active", isOpening);
      controlsToggle.setAttribute("aria-expanded", String(isOpening));
      controlsToggle.setAttribute("aria-label", isOpening ? "Hide visual controls" : "Show visual controls");
    });
  }

  document.querySelectorAll("[data-cell]").forEach((button) => {
    button.addEventListener("click", () => {
      atmosphere.cell = Number(button.dataset.cell) || 12;
      setButtonGroup(button, "[data-cell]");
    });
  });

  document.querySelectorAll("[data-brush]").forEach((button) => {
    button.addEventListener("click", () => {
      atmosphere.brush = button.dataset.brush || "soft";
      setButtonGroup(button, "[data-brush]");
    });
  });
}

function setButtonGroup(activeButton, selector) {
  document.querySelectorAll(selector).forEach((button) => {
    button.classList.toggle("active", button === activeButton);
  });
}

function setupAtmosphere() {
  if (!atmosphere.canvas) return;
  atmosphere.context = atmosphere.canvas.getContext("2d");
  resizeAtmosphere();
  window.addEventListener("resize", resizeAtmosphere);
  window.addEventListener("pointermove", (event) => {
    atmosphere.lastPointerPx = atmosphere.pointerPx;
    atmosphere.lastPointerPy = atmosphere.pointerPy;
    atmosphere.pointerPx = event.clientX;
    atmosphere.pointerPy = event.clientY;
    atmosphere.pointerX = event.clientX / window.innerWidth;
    atmosphere.pointerY = event.clientY / window.innerHeight;
  });
  requestAnimationFrame(drawAtmosphere);
}

function resizeAtmosphere() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  atmosphere.canvas.width = Math.floor(window.innerWidth * ratio);
  atmosphere.canvas.height = Math.floor(window.innerHeight * ratio);
  atmosphere.canvas.style.width = "100%";
  atmosphere.canvas.style.height = "100%";
  atmosphere.context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawAtmosphere() {
  const ctx = atmosphere.context;
  if (!ctx) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  atmosphere.time += 0.006;
  const colors = atmosphereColors();

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(
    width * atmosphere.pointerX,
    height * atmosphere.pointerY,
    20,
    width * atmosphere.pointerX,
    height * atmosphere.pointerY,
    Math.max(width, height) * 0.72
  );
  gradient.addColorStop(0, colors.glowA);
  gradient.addColorStop(0.44, colors.glowB);
  gradient.addColorStop(1, colors.glowEnd);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  drawGridField(ctx, width, height, colors);
  requestAnimationFrame(drawAtmosphere);
}

function atmosphereColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    background: styles.getPropertyValue("--canvas-bg").trim() || "#f4f1ea",
    glowA: styles.getPropertyValue("--canvas-glow-a").trim() || "rgba(111, 143, 154, 0.16)",
    glowB: styles.getPropertyValue("--canvas-glow-b").trim() || "rgba(143, 169, 154, 0.1)",
    glowEnd: styles.getPropertyValue("--canvas-glow-end").trim() || "rgba(255, 255, 255, 0)",
    gridSoft: styles.getPropertyValue("--canvas-grid-soft").trim() || "143, 169, 154",
    gridInk: styles.getPropertyValue("--canvas-grid-ink").trim() || "23, 21, 18",
  };
}

function drawGridField(ctx, width, height, colors) {
  const cell = atmosphere.cell;
  const alpha = atmosphere.brush === "ink" ? 0.2 : atmosphere.brush === "static" ? 0.08 : 0.11;
  ctx.lineWidth = atmosphere.brush === "ink" ? 1.4 : 0.8;

  for (let y = -cell; y < height + cell; y += cell) {
    for (let x = -cell; x < width + cell; x += cell) {
      const dx = x / width - atmosphere.pointerX;
      const dy = y / height - atmosphere.pointerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const wave = Math.sin(x * 0.012 + y * 0.018 + atmosphere.time * 8);
      const drift = Math.cos(y * 0.01 + atmosphere.time * 5) * 4;
      const pull = Math.max(0, 1 - distance * 2.8);
      const size = cell * (0.18 + pull * 0.52 + wave * 0.04);
      const hue = atmosphere.brush === "static" ? colors.gridInk : atmosphere.brush === "ink" ? colors.gridInk : colors.gridSoft;

      ctx.strokeStyle = `rgba(${hue}, ${alpha + pull * 0.1})`;
      ctx.beginPath();
      ctx.rect(x + drift + wave * pull * 10, y - wave * pull * 7, size, size);
      ctx.stroke();
    }
  }
}
