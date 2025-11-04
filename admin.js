// js/admin.js
// Admin logic: login + CRUD (seguro — verifica auth antes de qualquer ação)

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'VBLadmin2025!'; // altere aqui se quiser

// helper
const $ = id => document.getElementById(id);
const escapeHtml = s => (s===undefined||s===null) ? '' : String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// key used to remember admin session
const AUTH_KEY = 'vbl_admin_auth';

function isAuthed(){ return localStorage.getItem(AUTH_KEY) === 'true'; }
function requireAuthOrAlert(){
  if(!isAuthed()){
    alert('Ação restrita: faça login no painel administrativo antes.');
    return false;
  }
  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  // DOM elements
  const loginUser = $('loginUser');
  const loginPass = $('loginPass');
  const btnLogin = $('btnLogin');
  const btnLogout = $('btnLogout');
  const loginMsg = $('loginMsg');

  const adminArea = $('adminArea');
  const btnAdd = $('btnAdd');
  const pName = $('pName');
  const pScore = $('pScore');
  const pTeam = $('pTeam');
  const adminTbody = document.querySelector('#adminTable tbody');

  // enable/disable admin inputs and buttons
  function setAdminEnabled(enabled){
    if(!adminArea) return;
    if(enabled){
      adminArea.classList.remove('locked');
      adminArea.setAttribute('aria-disabled','false');
      if(btnLogout) btnLogout.style.display = 'inline-block';
      if(loginMsg){ loginMsg.style.color = 'lime'; loginMsg.textContent = 'Autenticado como administrador.'; }
    } else {
      adminArea.classList.add('locked');
      adminArea.setAttribute('aria-disabled','true');
      if(btnLogout) btnLogout.style.display = 'none';
      if(loginMsg){ loginMsg.style.color = ''; loginMsg.textContent = 'Informe credenciais para desbloquear o painel'; }
    }

    // disable/enable controls inside adminArea (but leave logout enabled outside)
    const controls = adminArea ? adminArea.querySelectorAll('input, button') : [];
    controls.forEach(el=>{
      // leave global logout alone
      if(el.id === 'btnLogout') return;
      el.disabled = !enabled;
      el.setAttribute('aria-disabled', (!enabled).toString());
      el.style.pointerEvents = enabled ? 'auto' : 'none';
      el.style.opacity = enabled ? '1' : '0.6';
    });

    // ensure btnAdd exists and is disabled when not enabled
    if(btnAdd) btnAdd.disabled = !enabled;
  }

  // Render admin table. If not authed, hide action column / actions.
  async function renderAdminTable(){
    adminTbody.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
    try {
      const list = await DB.getPlayers(); // uses your existing DB wrapper
      if(!Array.isArray(list) || list.length === 0){
        // if not authed, colspan should be 4, else 5 (with actions)
        const cols = isAuthed() ? 5 : 4;
        adminTbody.innerHTML = `<tr><td colspan="${cols}">Nenhum jogador cadastrado.</td></tr>`;
        return;
      }

      adminTbody.innerHTML = '';
      list.forEach((p, idx) => {
        const tr = document.createElement('tr');
        if(isAuthed()){
          tr.innerHTML = `
            <td>${idx+1}</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.team||'—')}</td>
            <td>${escapeHtml(p.score)}</td>
            <td>
              <button class="action-btn edit" data-id="${p.id}">Editar</button>
              <button class="action-btn remove" data-id="${p.id}">Excluir</button>
            </td>
          `;
        } else {
          // no action column shown
          tr.innerHTML = `
            <td>${idx+1}</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.team||'—')}</td>
            <td>${escapeHtml(p.score)}</td>
          `;
        }
        adminTbody.appendChild(tr);
      });
    } catch(err){
      console.error('renderAdminTable error', err);
      const cols = isAuthed() ? 5 : 4;
      adminTbody.innerHTML = `<tr><td colspan="${cols}">Erro ao carregar jogadores.</td></tr>`;
    }
  }

  // Add player (requires auth)
  async function addPlayer(){
    if(!requireAuthOrAlert()) return;
    const name = (pName.value || '').trim();
    const score = (pScore.value || '').trim();
    const team = (pTeam.value || '').trim();
    if(!name || !score){ alert('Nome e pontuação são obrigatórios.'); return; }
    await DB.addPlayer({ name, score, team });
    pName.value = ''; pScore.value = ''; pTeam.value = '';
    await renderAdminTable();
  }

  // Edit / Delete handlers (delegated)
  adminTbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if(!btn) return;
    // require auth
    if(!requireAuthOrAlert()) return;
    const id = Number(btn.dataset.id);
    if(btn.classList.contains('remove')){
      if(!confirm('Confirma exclusão?')) return;
      await DB.deletePlayer(id);
      await renderAdminTable();
    } else if(btn.classList.contains('edit')){
      // fetch current record
      const list = await DB.getPlayers();
      const rec = list.find(x=>x.id === id);
      if(!rec) return alert('Registro não encontrado.');
      const newName = prompt('Nome', rec.name);
      if(newName === null) return;
      const newScore = prompt('Pontuação', rec.score);
      if(newScore === null) return;
      const newTeam = prompt('Time', rec.team || '');
      if(newTeam === null) return;
      rec.name = newName; rec.score = newScore; rec.team = newTeam;
      await DB.updatePlayer(rec);
      await renderAdminTable();
    }
  });

  // Login
  async function tryLogin(){
    const user = (loginUser.value || '').trim();
    const pass = loginPass.value || '';
    if(user === ADMIN_USER && pass === ADMIN_PASS){
      localStorage.setItem(AUTH_KEY, 'true');
      setAdminEnabled(true);
      await renderAdminTable();
      loginUser.value = ''; loginPass.value = '';
    } else {
      if(loginMsg){ loginMsg.style.color = 'crimson'; loginMsg.textContent = 'Usuário ou senha incorretos.'; }
    }
  }

  function doLogout(){
    localStorage.removeItem(AUTH_KEY);
    setAdminEnabled(false);
    renderAdminTable();
  }

  // Wire events
  if(btnAdd) btnAdd.addEventListener('click', addPlayer);
  if(btnLogin) btnLogin.addEventListener('click', tryLogin);
  if(btnLogout) btnLogout.addEventListener('click', doLogout);
  if(loginPass) loginPass.addEventListener('keydown', e => { if(e.key === 'Enter') tryLogin(); });

  // Init: make sure DB is available before rendering table
  try { await DB.getPlayers(); } catch(e){ console.warn('DB init warning', e); }
  if(isAuthed()){
    setAdminEnabled(true);
    await renderAdminTable();
  } else {
    setAdminEnabled(false);
    await renderAdminTable(); // renders table without action buttons
  }

}); // end DOMContentLoaded
