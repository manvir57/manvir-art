const config = window.PORTFOLIO_ADMIN_CONFIG || {};
const loginPanel = document.querySelector("#login-panel");
const uploadPanel = document.querySelector("#upload-panel");
const setupPanel = document.querySelector("#setup-panel");
const loginForm = document.querySelector("#login-form");
const uploadForm = document.querySelector("#upload-form");
const logoutButton = document.querySelector("#logout-button");
const loginStatus = document.querySelector("#login-status");
const uploadStatus = document.querySelector("#upload-status");
const uploadList = document.querySelector("#upload-list");
const reviewPanel = document.querySelector("#review-panel");
const previewGrid = document.querySelector("#preview-grid");
const reviewSummary = document.querySelector("#review-summary");
const confirmUploadButton = document.querySelector("#confirm-upload-button");
const clearReviewButton = document.querySelector("#clear-review-button");

let pendingUpload = null;
let previewUrls = [];

const isConfigured =
  config.supabaseUrl &&
  config.supabaseAnonKey &&
  !config.supabaseUrl.includes("YOUR_PROJECT_ID") &&
  !config.supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY");

let supabase = null;

bootstrap();

async function bootstrap() {
  if (!isConfigured) {
    loginPanel.hidden = true;
    setupPanel.hidden = false;
    return;
  }

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  await init();
}

async function init() {
  const { data } = await supabase.auth.getSession();
  setLoggedIn(Boolean(data.session));

  supabase.auth.onAuthStateChange((_event, session) => {
    setLoggedIn(Boolean(session));
  });
}

function setLoggedIn(isLoggedIn) {
  loginPanel.hidden = isLoggedIn;
  uploadPanel.hidden = !isLoggedIn;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginStatus.textContent = "Signing in...";

  const form = new FormData(loginForm);
  const email = String(form.get("email") || "");
  const password = String(form.get("password") || "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  loginStatus.textContent = error ? error.message : "";
});

logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  uploadStatus.textContent = "";
  uploadList.replaceChildren();
  clearPreviewUrls();

  const form = new FormData(uploadForm);
  const gallerySlug = String(form.get("gallery") || "");
  const caption = String(form.get("caption") || "");
  const files = Array.from(document.querySelector("#images").files || []);

  if (!files.length) {
    uploadStatus.textContent = "Choose at least one image.";
    return;
  }

  pendingUpload = { gallerySlug, caption, files };
  renderPreviews(pendingUpload);
});

confirmUploadButton.addEventListener("click", async () => {
  if (!pendingUpload) return;

  const { gallerySlug, caption, files } = pendingUpload;
  uploadStatus.textContent = "Uploading...";
  confirmUploadButton.disabled = true;

  const results = [];
  for (const file of files) {
    const result = await uploadImage({ file, gallerySlug, caption });
    results.push(result);
    uploadList.append(renderResult(result));
  }

  const failures = results.filter((result) => result.error);
  uploadStatus.textContent = failures.length
    ? `${files.length - failures.length} uploaded, ${failures.length} failed.`
    : `${files.length} image${files.length === 1 ? "" : "s"} uploaded.`;

  if (!failures.length) {
    uploadForm.reset();
    pendingUpload = null;
    reviewPanel.hidden = true;
    previewGrid.replaceChildren();
    clearPreviewUrls();
  }

  confirmUploadButton.disabled = false;
});

clearReviewButton.addEventListener("click", () => {
  pendingUpload = null;
  uploadForm.reset();
  reviewPanel.hidden = true;
  previewGrid.replaceChildren();
  uploadStatus.textContent = "";
  clearPreviewUrls();
});

async function uploadImage({ file, gallerySlug, caption }) {
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const path = `${gallerySlug}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(config.storageBucket || "portfolio-images")
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { fileName: file.name, error: uploadError.message };
  }

  const { data } = supabase.storage.from(config.storageBucket || "portfolio-images").getPublicUrl(path);
  const imageUrl = data.publicUrl;

  const { error: insertError } = await supabase.from("portfolio_images").insert({
    gallery_slug: gallerySlug,
    image_url: imageUrl,
    storage_path: path,
    caption,
    file_name: file.name,
    file_size: file.size,
    content_type: file.type,
  });

  if (insertError) {
    await supabase.storage.from(config.storageBucket || "portfolio-images").remove([path]);
    return { fileName: file.name, imageUrl, error: friendlyDatabaseError(insertError.message) };
  }

  return { fileName: file.name, imageUrl };
}

function renderResult(result) {
  const item = document.createElement("p");
  if (result.error) {
    item.textContent = `${result.fileName}: ${result.error}`;
    return item;
  }

  const link = document.createElement("a");
  link.href = result.imageUrl;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = result.fileName;
  item.append("Uploaded ", link);
  return item;
}

function friendlyDatabaseError(message) {
  if (/permission denied for table portfolio_images/i.test(message)) {
    return "Database permission denied. Run the latest supabase/setup.sql file in Supabase SQL Editor, then try again.";
  }
  if (/row-level security/i.test(message)) {
    return "Blocked by Supabase Row Level Security. Check that the insert policy for portfolio_images allows authenticated users.";
  }
  return message;
}

function renderPreviews({ gallerySlug, files }) {
  previewGrid.replaceChildren();
  reviewPanel.hidden = false;

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  reviewSummary.textContent = `${files.length} image${files.length === 1 ? "" : "s"} selected for ${formatGallery(gallerySlug)} · ${formatBytes(totalBytes)} total`;

  for (const file of files) {
    const url = URL.createObjectURL(file);
    previewUrls.push(url);

    const item = document.createElement("article");
    item.className = "preview-card";

    const img = document.createElement("img");
    img.src = url;
    img.alt = "";

    const meta = document.createElement("div");
    meta.className = "preview-meta";

    const name = document.createElement("span");
    name.textContent = file.name;

    const size = document.createElement("span");
    size.textContent = formatBytes(file.size);

    meta.append(name, size);
    item.append(img, meta);
    previewGrid.append(item);
  }
}

function clearPreviewUrls() {
  for (const url of previewUrls) {
    URL.revokeObjectURL(url);
  }
  previewUrls = [];
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatGallery(slug) {
  const labels = {
    "professional-work": "Professional Work",
    safal: "Safal",
    photography: "Photography",
  };
  return labels[slug] || slug;
}
