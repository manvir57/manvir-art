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

const isConfigured =
  config.supabaseUrl &&
  config.supabaseAnonKey &&
  !config.supabaseUrl.includes("YOUR_PROJECT_ID") &&
  !config.supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY");

let supabase = null;

if (!isConfigured) {
  loginPanel.hidden = true;
  setupPanel.hidden = false;
} else {
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
  uploadStatus.textContent = "Uploading...";
  uploadList.replaceChildren();

  const form = new FormData(uploadForm);
  const gallerySlug = String(form.get("gallery") || "");
  const caption = String(form.get("caption") || "");
  const files = Array.from(document.querySelector("#images").files || []);

  if (!files.length) {
    uploadStatus.textContent = "Choose at least one image.";
    return;
  }

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
  }
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
    return { fileName: file.name, imageUrl, error: insertError.message };
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
