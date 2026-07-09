let projects = [];
let site = {};

const fallbackSite = {
  name: "Manvir Khangura",
  metaDescription: "manvir.art portfolio by Manvir Khangura.",
  kicker: "Portfolio",
  headline: "Manvir Khangura",
  description: "Marketing specialist and creative focused on visual storytelling, brand presence, and culture-driven content.",
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
    description: "Portrait, lifestyle, and event photography.",
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

const atmosphere = {
  canvas: document.querySelector("#atmosphere"),
  context: null,
  cell: 12,
  brush: "soft",
  pointerX: 0.5,
  pointerY: 0.5,
  time: 0,
};

init();

async function init() {
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

  renderLinks(document.querySelector("[data-site='heroLinks']"), data);
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
  if (data.linkedinUrl) nodes.push(textLink("LinkedIn", data.linkedinUrl));
  if (data.instagramUrl) nodes.push(textLink("Instagram", data.instagramUrl));

  const services = Array.isArray(data.services) ? data.services : [];
  const shownServices = options.fullServices ? services : services.slice(0, 2);
  for (const service of shownServices) {
    const span = document.createElement("span");
    span.textContent = service;
    nodes.push(span);
  }

  container.replaceChildren(...nodes);
}

function textLink(label, href) {
  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = label;
  return link;
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

  projectBack.href = "#home";
  projectBack.textContent = "Back home";
  projectType.textContent = `${project.category || "gallery"} / ${project.year || "now"}`;
  projectTitle.textContent = project.title;
  projectDescription.textContent = project.description || "";
  const images = Array.isArray(project.images) && project.images.length ? project.images : [project.cover];
  projectImages.replaceChildren(...images.filter(Boolean).map((src, index) => galleryImage(src, index)));
  showOnly("project");
  window.scrollTo({ top: 0, behavior: "auto" });
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

  const description = document.createElement("span");
  description.className = "project-row-description";
  description.textContent = project.description || "";

  const media = document.createElement("span");
  media.className = "project-row-media";
  if (project.cover) {
    media.append(galleryImage(project.cover, index));
  }

  const type = document.createElement("span");
  type.className = "project-row-type";
  type.textContent = project.category === "photography" ? "Gallery" : "Selected work";

  link.append(number, title, description, media, type);
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

function setActive(routeName) {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === routeName);
  });
}

function setupControlBoard() {
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

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0b0908";
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(
    width * atmosphere.pointerX,
    height * atmosphere.pointerY,
    20,
    width * atmosphere.pointerX,
    height * atmosphere.pointerY,
    Math.max(width, height) * 0.72
  );
  gradient.addColorStop(0, "rgba(229, 204, 151, 0.28)");
  gradient.addColorStop(0.42, "rgba(89, 112, 105, 0.16)");
  gradient.addColorStop(1, "rgba(11, 9, 8, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  drawGridField(ctx, width, height);
  requestAnimationFrame(drawAtmosphere);
}

function drawGridField(ctx, width, height) {
  const cell = atmosphere.cell;
  const alpha = atmosphere.brush === "ink" ? 0.3 : atmosphere.brush === "static" ? 0.18 : 0.24;
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
      const hue = atmosphere.brush === "static" ? "205, 205, 196" : "224, 194, 137";

      ctx.strokeStyle = `rgba(${hue}, ${alpha + pull * 0.16})`;
      ctx.beginPath();
      ctx.rect(x + drift + wave * pull * 10, y - wave * pull * 7, size, size);
      ctx.stroke();
    }
  }
}
