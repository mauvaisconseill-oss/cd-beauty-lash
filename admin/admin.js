const SUPABASE_URL = "https://zvkoxndvhdjptezakois.supabase.co";
const SUPABASE_KEY = "sb_publishable_tZoYEdjAYEeBOZyvmik0Xg_V78mHnPy";

const EMAILJS_SERVICE_ID = "service_sgn89hp";
const EMAILJS_PUBLIC_KEY = "Kcxv7wtbxTpXp9d-x";
const TEMPLATE_ACCEPTE = "template_1j40f1g";
const TEMPLATE_REFUSE = "template_mdf6n4b";

emailjs.init(EMAILJS_PUBLIC_KEY);

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- Éléments de la page ----
const loginPage = document.getElementById("login-page");
const adminPage = document.getElementById("admin-page");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const loginError = document.getElementById("login-error");

// ---- Gestion de l'authentification ----
async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showAdmin();
  } else {
    showLogin();
  }
}

function showAdmin() {
  loginPage.style.display = "none";
  adminPage.style.display = "block";
  loadReservations();
}

function showLogin() {
  loginPage.style.display = "flex";
  adminPage.style.display = "none";
}

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    loginError.textContent = "Merci de remplir l'email et le mot de passe.";
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    loginError.textContent = "Email ou mot de passe incorrect.";
    return;
  }

  loginError.textContent = "";
  showAdmin();
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  showLogin();
});

// Permet de valider avec la touche "Entrée"
document.getElementById("login-password").addEventListener("keypress", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

// ---- Gestion des réservations (inchangé) ----
async function loadReservations() {
  const { data, error } = await supabaseClient
    .from("reservations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    alert("Erreur : " + error.message);
    return;
  }

  const enAttente = data.filter(r => r.statut === "en attente");
  const acceptees = data.filter(r => r.statut === "accepté");
  const refusees = data.filter(r => r.statut === "refusé");

  document.getElementById("reservations-list").innerHTML = `
    <div class="admin-columns">
      <div>
        <h2>🟡 En attente (${enAttente.length})</h2>
        ${enAttente.map(card).join("")}
      </div>

      <div>
        <h2>🟢 Acceptées (${acceptees.length})</h2>
        ${acceptees.map(card).join("")}
      </div>

      <div>
        <h2>🔴 Refusées (${refusees.length})</h2>
        ${refusees.map(card).join("")}
      </div>
    </div>
  `;
}

function card(r) {
  return `
    <div class="reservation-card">
      <h3>${r.nom}</h3>
      <p><b>Prestation :</b> ${r.prestation}</p>
      <p><b>Date :</b> ${r.date_rdv}</p>
      <p><b>Heure :</b> ${r.heure_rdv}</p>
      <p><b>Téléphone :</b> ${r.telephone}</p>
      <p><b>Email :</b> ${r.email}</p>
      <p><b>Acompte :</b> ${r.acompte}</p>
      <p><b>Statut :</b> ${r.statut}</p>

      <a href="${r.capture_url}" target="_blank">Voir la capture</a>

      <br><br>

      ${r.statut === "en attente" ? `
        <button onclick="updateStatus(${r.id}, 'accepté')">✅ Accepter</button>
        <button onclick="updateStatus(${r.id}, 'refusé')">❌ Refuser</button>
      ` : ""}

      <button class="delete-btn" onclick="deleteReservation(${r.id})">
        🗑️ Supprimer
      </button>
    </div>
  `;
}

async function updateStatus(id, statut) {
  const { data, error: fetchError } = await supabaseClient
    .from("reservations")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    alert("Erreur : " + fetchError.message);
    return;
  }

  if (statut === "accepté") {
    await supabaseClient
      .from("creneaux_bloques")
      .insert({
        date_rdv: data.date_rdv,
        heure_rdv: data.heure_rdv
      });
  }

  const { error } = await supabaseClient
    .from("reservations")
    .update({ statut: statut })
    .eq("id", id);

  if (error) {
    alert("Erreur statut : " + error.message);
    return;
  }

  const templateId = statut === "accepté" ? TEMPLATE_ACCEPTE : TEMPLATE_REFUSE;

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, templateId, {
      nom: data.nom,
      email: data.email,
      date: data.date_rdv,
      heure: data.heure_rdv,
      prestation: data.prestation
    });
  } catch (mailError) {
    alert("Statut changé, mais erreur mail : " + mailError.text);
    loadReservations();
    return;
  }

  alert("Statut mis à jour et mail envoyé !");
  loadReservations();
}

async function deleteReservation(id) {
  const confirmDelete = confirm("Supprimer cette réservation ?");
  if (!confirmDelete) return;

  const { error } = await supabaseClient
    .from("reservations")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erreur suppression : " + error.message);
    return;
  }

  alert("Réservation supprimée !");
  loadReservations();
}

// ---- Démarrage ----
checkAuth();