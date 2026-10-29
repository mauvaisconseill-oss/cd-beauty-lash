const SUPABASE_URL = "https://zvkoxndvhdjptezakois.supabase.co";
const SUPABASE_KEY = "sb_publishable_tZoYEdjAYEeBOZyvmik0Xg_V78mHnPy";

const EMAILJS_SERVICE_ID = "service_sgn89hp";
const EMAILJS_PUBLIC_KEY = "Kcxv7wtbxTpXp9d-x";
const TEMPLATE_ACCEPTE = "template_1j40f1g";
const TEMPLATE_REFUSE = "template_mdf6n4b";

if (window.emailjs) emailjs.init(EMAILJS_PUBLIC_KEY);

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const loginPage = document.getElementById("login-page");
const adminPage = document.getElementById("admin-page");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const reservationsList = document.getElementById("reservations-list");
const planningMessage = document.getElementById("planning-message");
const confirmationToast = document.getElementById("confirmation-toast");
const confirmationToastTitle = document.getElementById("confirmation-toast-title");
const confirmationToastDescription = document.getElementById("confirmation-toast-description");
const resetScheduleDialog = document.getElementById("reset-schedule-dialog");
const reservationMessage = document.getElementById("reservation-message");
const reservationMessageIcon = document.getElementById("reservation-message-icon");
const reservationMessageTitle = document.getElementById("reservation-message-title");
const reservationMessageDescription = document.getElementById("reservation-message-description");
const reservationMessageActions = document.getElementById("reservation-message-actions");

const JOURS_SEMAINE = [
  { key: "lundi", label: "Lundi" },
  { key: "mardi", label: "Mardi" },
  { key: "mercredi", label: "Mercredi" },
  { key: "jeudi", label: "Jeudi" },
  { key: "vendredi", label: "Vendredi" },
  { key: "samedi", label: "Samedi" },
  { key: "dimanche", label: "Dimanche" }
];

const DEFAULT_SCHEDULE = {
  lundi: { ouvert: true, debut: "15:30", fin: "18:00" },
  mardi: { ouvert: true, debut: "15:30", fin: "18:00" },
  mercredi: { ouvert: true, debut: "12:00", fin: "18:00" },
  jeudi: { ouvert: true, debut: "15:30", fin: "18:00" },
  vendredi: { ouvert: true, debut: "15:30", fin: "18:00" },
  samedi: { ouvert: true, debut: "13:00", fin: "18:00" },
  dimanche: { ouvert: true, debut: "11:00", fin: "18:00" }
};

let reservations = [];
let activeFilter = "en attente";
let horairesActuels = {};
let planningLoaded = false;
let currentView = "reservations";
let semaineAffichee = getLundiDeLaSemaine(new Date());
let moisAffiche = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedCalendarDate = "";
let reservationMessageTimer;
let confirmationToastTimer;
let pendingResetDate = "";

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const submitButton = document.getElementById("login-btn");

  if (!email || !password) {
    loginError.textContent = "Merci de remplir l'e-mail et le mot de passe.";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Connexion en cours…";
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.code === "email_not_confirmed") {
        loginError.textContent = "Ce compte n'est pas confirmé. Dans Supabase → Authentication → Users, confirme l'adresse e-mail du compte.";
      } else if (error.code === "invalid_credentials" || error.message === "Invalid login credentials") {
        loginError.textContent = "Identifiants non reconnus. Vérifie que le compte a été créé dans le projet Supabase CD Beauty Lash (zvkoxndvhdjptezakois) et que le mot de passe est correct.";
      } else {
        console.error("Connexion Supabase refusée.", error);
        loginError.textContent = "Connexion refusée par Supabase. Vérifie l'état du compte dans Authentication → Users.";
      }
      return;
    }
    showAdmin();
  } catch (error) {
    console.error("Impossible de joindre le service de connexion Supabase.", error);
    loginError.textContent = "Le service de connexion est momentanément inaccessible. Vérifie ta connexion Internet puis réessaie.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Se connecter";
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    alert("Erreur lors de la déconnexion : " + error.message);
    return;
  }
  showLogin();
});

document.querySelectorAll(".main-tab").forEach(button => {
  button.addEventListener("click", () => switchMainView(button.dataset.view));
});

document.querySelectorAll(".filter-chip").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter-chip").forEach(chip => {
      const active = chip === button;
      chip.classList.toggle("active", active);
      chip.setAttribute("aria-pressed", String(active));
    });
    renderReservations();
  });
});

document.getElementById("refresh-btn").addEventListener("click", async () => {
  await loadReservations();
  if (!document.getElementById("planning-view").hidden) {
    renderCalendar();
    await loadPlanning();
  }
});

document.getElementById("save-horaires-btn").addEventListener("click", saveHoraires);
document.getElementById("cancel-reset-btn").addEventListener("click", () => resetScheduleDialog.close());
document.getElementById("confirm-reset-btn").addEventListener("click", async event => {
  const button = event.currentTarget;
  button.disabled = true;
  resetScheduleDialog.close();
  try {
    await resetJourSemaine(pendingResetDate);
  } finally {
    button.disabled = false;
    pendingResetDate = "";
  }
});
document.getElementById("week-prev-btn").addEventListener("click", () => {
  semaineAffichee.setDate(semaineAffichee.getDate() - 7);
  loadSemaine();
});
document.getElementById("week-next-btn").addEventListener("click", () => {
  semaineAffichee.setDate(semaineAffichee.getDate() + 7);
  loadSemaine();
});
document.getElementById("week-today-btn").addEventListener("click", () => {
  semaineAffichee = getLundiDeLaSemaine(new Date());
  loadSemaine();
});
document.getElementById("month-prev-btn").addEventListener("click", () => {
  moisAffiche.setMonth(moisAffiche.getMonth() - 1);
  clearCalendarSelection();
  renderCalendar();
});
document.getElementById("month-next-btn").addEventListener("click", () => {
  moisAffiche.setMonth(moisAffiche.getMonth() + 1);
  clearCalendarSelection();
  renderCalendar();
});
document.getElementById("month-today-btn").addEventListener("click", () => {
  moisAffiche = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  clearCalendarSelection();
  renderCalendar();
});

async function checkAuth() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    alert("Impossible de vérifier la connexion : " + error.message);
    showLogin();
    return;
  }
  if (data.session) showAdmin();
  else showLogin();
}

function showAdmin() {
  loginPage.hidden = true;
  adminPage.hidden = false;
  refreshAllData();
}

function showLogin() {
  loginPage.hidden = false;
  adminPage.hidden = true;
}

function switchMainView(view) {
  document.querySelectorAll(".main-tab").forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.getElementById("reservations-view").hidden = view !== "reservations";
  document.getElementById("planning-view").hidden = view !== "planning";
  if (view === "planning" && currentView !== "planning" && !planningLoaded) {
    renderCalendar();
    loadPlanning();
  }
  currentView = view;
}

async function refreshAllData() {
  await loadReservations();
}

async function loadReservations() {
  const { data, error } = await supabaseClient
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    reservationsList.textContent = "Impossible de charger les réservations : " + error.message;
    reservationsList.className = "status-message";
    return;
  }

  reservations = await Promise.all((data || []).map(async reservation => {
    const capturePath = reservation.capture_paiement_path ||
      getStorageObjectPath(reservation.capture_url, "paiements");
    const [captureResult, photoResult] = await Promise.all([
      capturePath
        ? supabaseClient.storage.from("paiements").createSignedUrl(capturePath, 60 * 60)
        : Promise.resolve({ data: null, error: null }),
      reservation.photo_remplissage_path
        ? supabaseClient.storage.from("photos-remplissage").createSignedUrl(reservation.photo_remplissage_path, 60 * 60)
        : Promise.resolve({ data: null, error: null })
    ]);

    if (captureResult.error) console.error("Impossible de créer un lien sécurisé pour la capture du paiement.", captureResult.error);
    if (photoResult.error) console.error("Impossible de créer un lien sécurisé pour la photo du remplissage.", photoResult.error);

    return {
      ...reservation,
      captureUrl: captureResult.data ? captureResult.data.signedUrl : reservation.capture_url,
      captureError: captureResult.error ? captureResult.error.message : "",
      photoRemplissageUrl: photoResult.data ? photoResult.data.signedUrl : "",
      photoRemplissageError: photoResult.error ? photoResult.error.message : ""
    };
  }));
  reservationsList.className = "";
  renderReservations();
  renderCalendar();
  if (selectedCalendarDate) showDayDetail(selectedCalendarDate, false);
}

function renderReservations() {
  const pending = reservations.filter(reservation => reservation.statut === "en attente");
  const accepted = reservations.filter(reservation => reservation.statut === "accepté");
  const refused = reservations.filter(reservation => reservation.statut === "refusé");
  document.getElementById("count-pending").textContent = pending.length;
  document.getElementById("count-accepted").textContent = accepted.length;
  document.getElementById("count-refused").textContent = refused.length;

  const selected = reservations.filter(reservation => reservation.statut === activeFilter);
  reservationsList.replaceChildren();
  if (!selected.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucune demande dans cette catégorie.";
    reservationsList.appendChild(empty);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "admin-columns";
  selected.forEach(reservation => grid.appendChild(createReservationCard(reservation)));
  reservationsList.appendChild(grid);
}

function createReservationCard(reservation) {
  const card = document.createElement("article");
  card.className = "reservation-card";

  const heading = document.createElement("h4");
  heading.textContent = reservation.nom || "Sans nom";
  card.appendChild(heading);

  const details = [
    ["Prestation", reservation.prestation],
    ["Date", formatDate(reservation.date_rdv)],
    ["Heure", reservation.heure_rdv],
    ["Téléphone", reservation.telephone],
    ["E-mail", reservation.email],
    ["Acompte", reservation.acompte],
    ["Statut", reservation.statut]
  ];
  details.forEach(([label, value]) => {
    if (!value) return;
    const paragraph = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = label + " : ";
    paragraph.append(strong, document.createTextNode(String(value)));
    card.appendChild(paragraph);
  });

  const captureUrl = safeHttpsUrl(reservation.captureUrl);
  if (captureUrl) {
    const link = document.createElement("a");
    link.href = captureUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Voir la capture de paiement";
    card.appendChild(link);
  } else if (reservation.captureError) {
    const captureError = document.createElement("p");
    captureError.className = "status-message";
    captureError.textContent = "Capture de paiement indisponible : " + reservation.captureError;
    card.appendChild(captureError);
  }

  const refillPhotoUrl = safeHttpsUrl(reservation.photoRemplissageUrl);
  if (refillPhotoUrl) {
    const link = document.createElement("a");
    link.href = refillPhotoUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Voir la photo des cils (remplissage)";
    card.appendChild(link);
  } else if (reservation.photoRemplissageError) {
    const photoError = document.createElement("p");
    photoError.className = "status-message";
    photoError.textContent = "Photo du remplissage indisponible : " + reservation.photoRemplissageError;
    card.appendChild(photoError);
  }

  const actions = document.createElement("div");
  actions.className = "reservation-actions";
  if (reservation.statut === "en attente") {
    const accept = createActionButton("Accepter", "button-accept", () => updateStatus(reservation.id, "accepté"));
    const refuse = createActionButton("Refuser", "button-refuse", () => updateStatus(reservation.id, "refusé"));
    actions.append(accept, refuse);
  }
  actions.appendChild(createActionButton("Supprimer", "button-delete", () => deleteReservation(reservation)));
  card.appendChild(actions);
  return card;
}

function createActionButton(label, className, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button " + className;
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

function showReservationMessage(title, description, type = "success", actions = []) {
  clearTimeout(reservationMessageTimer);
  reservationMessage.className = "reservation-message " + type;
  reservationMessageTitle.textContent = title;
  reservationMessageDescription.textContent = description;
  reservationMessageIcon.textContent = type === "success" ? "✓" : type === "error" ? "!" : "✦";
  reservationMessageActions.replaceChildren(...actions);
  reservationMessage.hidden = false;

  if (type === "error") {
    reservationMessage.setAttribute("role", "alert");
    reservationMessage.setAttribute("aria-live", "assertive");
  } else {
    reservationMessage.setAttribute("role", "status");
    reservationMessage.setAttribute("aria-live", "polite");
  }

  if (!actions.length) {
    reservationMessageTimer = setTimeout(() => {
      reservationMessage.hidden = true;
    }, 7000);
  }
}

async function updateStatus(id, statut) {
  const reservation = reservations.find(item => String(item.id) === String(id));
  if (!reservation) {
    showReservationMessage("Cette réservation n’est plus disponible", "Actualise la page avant de réessayer.", "error");
    return;
  }

  let createdBlockedSlot = false;
  if (statut === "accepté") {
    const { data: existingSlots, error: checkError } = await supabaseClient
      .from("creneaux_bloques")
      .select("date_rdv, heure_rdv")
      .eq("date_rdv", reservation.date_rdv)
      .eq("heure_rdv", reservation.heure_rdv)
      .limit(1);
    if (checkError) {
      showReservationMessage("Impossible de vérifier le créneau", checkError.message, "error");
      return;
    }

    if (!existingSlots || existingSlots.length === 0) {
      const { error: insertError } = await supabaseClient.from("creneaux_bloques").insert({
        date_rdv: reservation.date_rdv,
        heure_rdv: reservation.heure_rdv
      });
      if (insertError) {
        showReservationMessage("Impossible de bloquer le créneau", insertError.message, "error");
        return;
      }
      createdBlockedSlot = true;
    }
  }

  const { error } = await supabaseClient
    .from("reservations")
    .update({ statut })
    .eq("id", id);

  if (error) {
    if (createdBlockedSlot) {
      const { error: rollbackError } = await supabaseClient
        .from("creneaux_bloques")
        .delete()
        .eq("date_rdv", reservation.date_rdv)
        .eq("heure_rdv", reservation.heure_rdv);
      if (rollbackError) console.error("Impossible de libérer le créneau après l'échec du statut.", rollbackError);
    }
    showReservationMessage("Le statut n’a pas pu être mis à jour", error.message, "error");
    return;
  }

  const templateId = statut === "accepté" ? TEMPLATE_ACCEPTE : TEMPLATE_REFUSE;
  let emailSent = false;
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, templateId, {
      nom: reservation.nom,
      email: reservation.email,
      date: reservation.date_rdv,
      heure: reservation.heure_rdv,
      prestation: reservation.prestation
    });
    emailSent = true;
  } catch (mailError) {
    console.error("E-mail de réservation non envoyé.", mailError);
  }

  await refreshAllData();
  const customer = reservation.nom ? ` de ${reservation.nom}` : "";
  if (emailSent) {
    showReservationMessage(
      statut === "accepté" ? "Rendez-vous accepté" : "Demande refusée",
      statut === "accepté"
        ? `Le rendez-vous${customer} a bien été accepté. L’e-mail de confirmation a été envoyé.`
        : `La demande${customer} a bien été refusée. L’e-mail a été envoyé.`,
      "success"
    );
  } else {
    showReservationMessage(
      statut === "accepté" ? "Rendez-vous accepté" : "Demande refusée",
      `Le statut${customer} a été mis à jour, mais l’e-mail n’a pas pu être envoyé.`,
      "warning"
    );
  }
}

function deleteReservation(reservation) {
  const cancelButton = createActionButton("Annuler", "button-outline", () => {
    reservationMessage.hidden = true;
  });
  const confirmButton = createActionButton("Supprimer", "button-delete", () => removeReservation(reservation));
  showReservationMessage(
    "Supprimer cette réservation ?",
    `La demande de ${reservation.nom || "cette cliente"} sera supprimée définitivement.`,
    "confirmation",
    [cancelButton, confirmButton]
  );
}

async function removeReservation(reservation) {
  reservationMessageActions.querySelectorAll("button").forEach(button => { button.disabled = true; });
  const { error } = await supabaseClient
    .from("reservations")
    .delete()
    .eq("id", reservation.id);
  if (error) {
    showReservationMessage("La réservation n’a pas pu être supprimée", error.message, "error");
    return;
  }

  if (reservation.statut === "accepté" && reservation.date_rdv && reservation.heure_rdv) {
    const { error: releaseError } = await supabaseClient
      .from("creneaux_bloques")
      .delete()
      .eq("date_rdv", reservation.date_rdv)
      .eq("heure_rdv", reservation.heure_rdv);
    if (releaseError) {
      await refreshAllData();
      showReservationMessage(
        "Réservation supprimée avec un avertissement",
        `Le créneau n’a pas pu être libéré : ${releaseError.message}`,
        "warning"
      );
      return;
    }
  }
  await refreshAllData();
  showReservationMessage(
    "Réservation supprimée",
    `La demande de ${reservation.nom || "la cliente"} a bien été supprimée.`,
    "success"
  );
}

function safeHttpsUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function getStorageObjectPath(signedUrl, bucket) {
  if (!signedUrl) return "";
  try {
    const url = new URL(signedUrl);
    const supabaseOrigin = new URL(SUPABASE_URL).origin;
    const prefix = `/storage/v1/object/sign/${bucket}/`;
    if (url.protocol !== "https:" || url.origin !== supabaseOrigin || !url.pathname.startsWith(prefix)) return "";
    return decodeURIComponent(url.pathname.slice(prefix.length));
  } catch {
    return "";
  }
}

function formatDate(value, options = { day: "numeric", month: "long", year: "numeric" }) {
  if (!value) return "";
  const date = new Date(value + "T00:00:00");
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("fr-FR", options);
}

async function loadPlanning() {
  planningMessage.textContent = "";
  if (!Object.keys(horairesActuels).length) horairesActuels = DEFAULT_SCHEDULE;
  renderJoursList();

  const { data, error } = await supabaseClient
    .from("planning_config")
    .select("jours")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    planningMessage.textContent = error.code === "PGRST205" && error.message.includes("planning_config")
      ? "La table des horaires manque dans Supabase. Dans le projet relié au site, exécute configuration-supabase.sql (section 5), puis recharge la page."
      : "Affichage des horaires par défaut. Exécute le script SQL Supabase pour enregistrer et appliquer tes disponibilités aux réservations.";
    console.error("Chargement de la configuration du planning impossible.", error);
    await loadSemaine();
    return;
  }

  horairesActuels = data && data.jours ? data.jours : DEFAULT_SCHEDULE;
  if (!data) planningMessage.textContent = "Enregistre tes horaires pour commencer à les appliquer aux réservations.";
  renderJoursList();
  await loadSemaine();
  planningLoaded = true;
}

function renderJoursList() {
  const list = document.getElementById("jours-list");
  list.replaceChildren();
  JOURS_SEMAINE.forEach(day => {
    const config = horairesActuels[day.key] || { ouvert: false };
    const row = document.createElement("div");
    row.className = "jour-row";
    row.dataset.jour = day.key;

    const name = document.createElement("span");
    name.className = "jour-nom";
    name.textContent = day.label;
    row.appendChild(name);
    const index = document.createElement("span");
    index.className = "jour-index";
    index.textContent = String(JOURS_SEMAINE.indexOf(day) + 1).padStart(2, "0");
    row.appendChild(index);

    const toggleLabel = document.createElement("label");
    toggleLabel.className = "jour-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "jour-ouvert-check";
    checkbox.checked = Boolean(config.ouvert);
    toggleLabel.append(checkbox, document.createTextNode("Ouvert"));
    row.appendChild(toggleLabel);

    const hours = document.createElement("div");
    hours.className = "jour-heures";
    hours.hidden = !config.ouvert;
    const start = createTimeInput(config.debut || DEFAULT_SCHEDULE[day.key].debut);
    const end = createTimeInput(config.fin || DEFAULT_SCHEDULE[day.key].fin);
    hours.append(start, document.createTextNode("à"), end);
    row.appendChild(hours);

    const closed = document.createElement("span");
    closed.className = "jour-ferme-label";
    closed.textContent = "Fermé";
    closed.hidden = Boolean(config.ouvert);
    row.appendChild(closed);

    checkbox.addEventListener("change", () => {
      hours.hidden = !checkbox.checked;
      closed.hidden = checkbox.checked;
    });
    list.appendChild(row);
  });
}

function createTimeInput(value) {
  const input = document.createElement("input");
  input.type = "time";
  input.value = String(value).slice(0, 5);
  return input;
}

function showConfirmationToast(title, description) {
  clearTimeout(confirmationToastTimer);
  confirmationToastTitle.textContent = title;
  confirmationToastDescription.textContent = description;
  confirmationToast.hidden = false;
  confirmationToastTimer = setTimeout(() => {
    confirmationToast.hidden = true;
  }, 2000);
}

async function saveHoraires() {
  const nouveauxJours = {};
  for (const day of JOURS_SEMAINE) {
    const row = document.querySelector(`#jours-list [data-jour="${day.key}"]`);
    const ouvert = row.querySelector(".jour-ouvert-check").checked;
    const [debut, fin] = row.querySelectorAll('input[type="time"]');
    if (ouvert && (!debut.value || !fin.value || debut.value >= fin.value)) {
      planningMessage.textContent = `Vérifie les horaires du ${day.label.toLowerCase()} : l'heure de fin doit être après l'heure de début.`;
      return;
    }
    nouveauxJours[day.key] = ouvert
      ? { ouvert: true, debut: debut.value, fin: fin.value }
      : { ouvert: false };
  }

  const button = document.getElementById("save-horaires-btn");
  button.disabled = true;
  const { error } = await supabaseClient.from("planning_config").upsert({
    id: 1,
    jours: nouveauxJours,
    updated_at: new Date().toISOString()
  }, { onConflict: "id" });
  button.disabled = false;

  if (error) {
    planningMessage.textContent = "Erreur lors de l'enregistrement des horaires : " + error.message;
    return;
  }
  horairesActuels = nouveauxJours;
  showConfirmationToast("Modifications effectuées !", "Tes horaires ont bien été enregistrés.");
  await loadSemaine();
}

function getLundiDeLaSemaine(date) {
  const monday = new Date(date);
  const day = monday.getDay();
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function loadSemaine() {
  const startOfWeek = new Date(semaineAffichee);
  const endOfWeek = new Date(semaineAffichee);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  updateWeekHeader(startOfWeek, endOfWeek);
  renderSemaineJours(startOfWeek, new Map());

  const { data, error } = await supabaseClient
    .from("planning_overrides")
    .select("date, ouvert, debut, fin")
    .gte("date", toISODate(startOfWeek))
    .lte("date", toISODate(endOfWeek));

  if (error) {
    planningMessage.textContent = "Les jours restent modifiables ici, mais les enregistrer nécessite les tables du planning. Exécute configuration-supabase.sql dans Supabase.";
    console.error("Chargement des exceptions hebdomadaires impossible.", error);
    return;
  }
  renderSemaineJours(startOfWeek, new Map((data || []).map(item => [item.date, item])));
}

function updateWeekHeader(startOfWeek, endOfWeek) {
  document.getElementById("week-label").textContent = `Semaine du ${startOfWeek.getDate()} au ${endOfWeek.getDate()}`;
  document.getElementById("week-sublabel").textContent =
    `${formatDate(toISODate(startOfWeek), { day: "2-digit", month: "short" })} — ${formatDate(toISODate(endOfWeek), { day: "2-digit", month: "short", year: "numeric" })}`;
}

function renderSemaineJours(startOfWeek, overrides) {
  const list = document.getElementById("week-days-list");
  list.replaceChildren();
  JOURS_SEMAINE.forEach((day, index) => {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + index);
    const isoDate = toISODate(date);
    const override = overrides.get(isoDate);
    const regular = horairesActuels[day.key] || DEFAULT_SCHEDULE[day.key];
    const config = override || regular;
    const row = document.createElement("div");
    row.className = "jour-row" + (override ? " override" : "");
    row.dataset.date = isoDate;

    const dateLabel = document.createElement("span");
    dateLabel.className = "jour-date";
    dateLabel.textContent = formatDate(isoDate, { day: "2-digit", month: "short" });
    row.appendChild(dateLabel);
    const dayIndex = document.createElement("span");
    dayIndex.className = "jour-index";
    dayIndex.textContent = String(index + 1).padStart(2, "0");
    row.appendChild(dayIndex);

    const name = document.createElement("span");
    name.className = "jour-nom";
    name.textContent = day.label;
    if (override) {
      const badge = document.createElement("span");
      badge.className = "override-badge";
      badge.textContent = "MODIFIÉ";
      name.appendChild(badge);
    }
    row.appendChild(name);

    const toggleLabel = document.createElement("label");
    toggleLabel.className = "jour-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "week-open-check";
    checkbox.checked = Boolean(config.ouvert);
    toggleLabel.append(checkbox, document.createTextNode("Ouvert"));
    row.appendChild(toggleLabel);

    const hours = document.createElement("div");
    hours.className = "jour-heures";
    hours.hidden = !config.ouvert;
    const start = createTimeInput(config.debut || DEFAULT_SCHEDULE[day.key].debut);
    const end = createTimeInput(config.fin || DEFAULT_SCHEDULE[day.key].fin);
    hours.append(start, document.createTextNode("à"), end);
    row.appendChild(hours);

    const closed = document.createElement("span");
    closed.className = "jour-ferme-label";
    closed.textContent = "Fermé";
    closed.hidden = Boolean(config.ouvert);
    row.appendChild(closed);

    const save = document.createElement("button");
    save.type = "button";
    save.className = "text-button";
    save.textContent = "Enregistrer";
    save.addEventListener("click", () => saveWeekOverride(isoDate, row));
    row.appendChild(save);

    if (override) {
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "btn-reset-jour";
      reset.textContent = "Revenir à l'horaire habituel";
      reset.addEventListener("click", () => {
        pendingResetDate = isoDate;
        resetScheduleDialog.showModal();
      });
      row.appendChild(reset);
    }

    checkbox.addEventListener("change", () => {
      hours.hidden = !checkbox.checked;
      closed.hidden = checkbox.checked;
    });
    list.appendChild(row);
  });
}

async function saveWeekOverride(date, row) {
  const opened = row.querySelector(".week-open-check").checked;
  const [start, end] = row.querySelectorAll('input[type="time"]');
  if (opened && (!start.value || !end.value || start.value >= end.value)) {
    planningMessage.textContent = "L'heure de fin doit être après l'heure de début.";
    return;
  }

  const { error } = await supabaseClient.from("planning_overrides").upsert({
    date,
    ouvert: opened,
    debut: opened ? start.value : null,
    fin: opened ? end.value : null,
    updated_at: new Date().toISOString()
  }, { onConflict: "date" });

  if (error) {
    planningMessage.textContent = "Erreur lors de l'enregistrement de ce jour : " + error.message;
    return;
  }
  planningMessage.textContent = "Modification enregistrée pour le " + formatDate(date) + ".";
  await loadSemaine();
}

async function resetJourSemaine(date) {
  const { error } = await supabaseClient.from("planning_overrides").delete().eq("date", date);
  if (error) {
    planningMessage.textContent = "Erreur lors du rétablissement de l'horaire habituel : " + error.message;
    return;
  }
  await loadSemaine();
  showConfirmationToast("Horaire rétabli !", `L’horaire habituel est de retour pour le ${formatDate(date)}.`);
}

function renderCalendar() {
  const year = moisAffiche.getFullYear();
  const month = moisAffiche.getMonth();
  document.getElementById("month-label").textContent = moisAffiche.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const grid = document.getElementById("calendar-grid");
  grid.replaceChildren();
  ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].forEach(label => {
    const heading = document.createElement("div");
    heading.className = "calendar-day-head";
    heading.textContent = label;
    grid.appendChild(heading);
  });

  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  for (let index = 0; index < offset; index++) {
    const empty = document.createElement("div");
    empty.className = "calendar-cell empty";
    grid.appendChild(empty);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = toISODate(new Date());
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isoDate = toISODate(date);
    const dayReservations = reservations.filter(item =>
      item.date_rdv === isoDate && item.statut !== "refusé"
    ).sort((left, right) => String(left.heure_rdv || "").localeCompare(String(right.heure_rdv || "")));

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-cell" +
      (isoDate === today ? " today" : "") +
      (isoDate === selectedCalendarDate ? " selected" : "");
    cell.setAttribute("aria-label", `${formatDate(isoDate)} : ${dayReservations.length} rendez-vous`);
    cell.addEventListener("click", () => showDayDetail(isoDate));

    const number = document.createElement("div");
    number.className = "calendar-day-number";
    number.textContent = day;
    cell.appendChild(number);

    dayReservations.slice(0, 3).forEach(reservation => {
      const appointment = document.createElement("div");
      appointment.className = "calendar-event " + (reservation.statut === "accepté" ? "accepted" : "pending");
      appointment.textContent = `${reservation.heure_rdv || "Heure à définir"} · ${reservation.nom || "Sans nom"}`;
      cell.appendChild(appointment);
    });
    if (dayReservations.length > 3) {
      const more = document.createElement("div");
      more.className = "calendar-more";
      more.textContent = `+${dayReservations.length - 3} autre(s)`;
      cell.appendChild(more);
    }
    grid.appendChild(cell);
  }

}

function clearCalendarSelection() {
  selectedCalendarDate = "";
  document.getElementById("day-detail").hidden = true;
}

function showDayDetail(date, scroll = true) {
  selectedCalendarDate = date;
  const detail = document.getElementById("day-detail");
  detail.hidden = false;
  document.getElementById("day-detail-title").textContent = formatDate(date, {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const dayReservations = reservations.filter(item =>
    item.date_rdv === date && item.statut !== "refusé"
  ).sort((left, right) => String(left.heure_rdv || "").localeCompare(String(right.heure_rdv || "")));
  const list = document.getElementById("day-detail-list");
  list.replaceChildren();
  if (!dayReservations.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucun rendez-vous prévu ce jour.";
    list.appendChild(empty);
  }

  dayReservations.forEach(reservation => {
    const item = document.createElement("article");
    item.className = "appointment-item";
    const content = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = reservation.nom || "Sans nom";
    content.appendChild(name);

    const summary = document.createElement("p");
    summary.textContent = [reservation.prestation, reservation.telephone, reservation.email].filter(Boolean).join(" · ");
    content.appendChild(summary);
    item.appendChild(content);

    const time = document.createElement("span");
    time.className = "appointment-time";
    time.textContent = reservation.heure_rdv || "Heure à définir";
    item.appendChild(time);

    const status = document.createElement("span");
    status.className = "appointment-status " + (reservation.statut === "accepté" ? "accepted" : "pending");
    status.textContent = reservation.statut === "accepté" ? "Accepté" : "En attente";
    item.appendChild(status);
    list.appendChild(item);
  });

  renderCalendar();
  if (scroll) detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function start() {
  await checkAuth();
}

start();
