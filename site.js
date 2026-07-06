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
    slug: "professional-work",
    title: "Professional Work",
    year: 2026,
    category: "work",
    description: "Selected professional marketing, creative, and visual direction work.",
    cover: "sample/personal-02.svg",
    images: ["sample/personal-02.svg", "sample/event-01.svg", "sample/event-02.svg"],
    published: true,
    featured: true,
  },
  {
    slug: "safal",
    title: "Safal",
    year: 2026,
    category: "work",
    description: "A focused section for Safal project work, visuals, and campaign materials.",
    cover: "sample/portrait-01.svg",
    images: ["sample/portrait-01.svg", "sample/portrait-02.svg"],
    published: true,
    featured: true,
  },
  {
    slug: "photography",
    title: "Photography",
    year: 2026,
    category: "photography",
    description: "Portrait, lifestyle, and event photography.",
    cover: "uploads/manvir/portrait.jpg",
    images: ["uploads/manvir/portrait.jpg", "uploads/manvir/source.jpg"],
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
const projectTitle = document.querySelector("#project-title");
const projectYear = document.querySelector("#project-year");
const projectDescription = document.querySelector("#project-description");
const projectImages = document.querySelector("#project-images");

init();

async function init() {
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
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.year - a.year);

  renderSite(site);
  renderGrid(featuredGrid, projects);
  window.addEventListener("hashchange", route);
  route();
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

  const heroImage = document.querySelector("[data-site='heroImage']");
  if (heroImage && data.heroImage) {
    heroImage.src = data.heroImage;
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
  if (data.linkedinUrl) {
    const link = document.createElement("a");
    link.href = data.linkedinUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "LinkedIn";
    nodes.push(link);
  }

  if (data.instagramUrl) {
    const link = document.createElement("a");
    link.href = data.instagramUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Instagram";
    nodes.push(link);
  }

  const services = Array.isArray(data.services) ? data.services : [];
  const shownServices = options.fullServices ? services : services.slice(0, 2);
  for (const service of shownServices) {
    const span = document.createElement("span");
    span.textContent = service;
    nodes.push(span);
  }
  container.replaceChildren(...nodes);
}

function route() {
  const raw = window.location.hash.replace(/^#\/?/, "") || "home";
  const [first, second] = raw.split("/");

  setActive(first === "project" || first === "section" ? second || "galleries" : first);

  if (first === "contact") {
    showOnly("contact");
    return;
  }

  if (first === "project" && second) {
    renderProject(second);
    return;
  }

  if (first === "section" && second) {
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
  renderGrid(archiveGrid, projects);
  showOnly("archive");
}

function renderProject(slug) {
  const project = projects.find((item) => item.slug === slug);
  if (!project) {
    window.location.hash = "#home";
    return;
  }

  projectBack.href = "#galleries";
  projectBack.textContent = "Sections";
  projectTitle.textContent = project.title;
  projectYear.textContent = project.year;
  projectDescription.textContent = project.description || "";
  const images = Array.isArray(project.images) && project.images.length ? project.images : [project.cover];
  projectImages.replaceChildren(...images.filter(Boolean).map(image));
  showOnly("project");
}

function renderGrid(container, items) {
  container.replaceChildren(...items.map(projectTile));
}

function projectTile(project) {
  const link = document.createElement("a");
  link.className = "project-tile";
  link.href = `#project/${project.slug}`;

  if (project.cover) {
    link.append(image(project.cover));
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "image-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    link.append(placeholder);
  }

  const meta = document.createElement("span");
  meta.className = "project-meta";

  const title = document.createElement("span");
  title.textContent = project.title;
  const year = document.createElement("span");
  year.textContent = project.category === "photography" ? "Gallery" : "Section";
  meta.append(title, year);
  link.append(meta);

  return link;
}

function image(src) {
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.loading = "lazy";
  return img;
}

function setActive(routeName) {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === routeName);
  });
}
