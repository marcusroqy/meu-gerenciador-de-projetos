document.addEventListener('DOMContentLoaded', () => {
  // Estado básico
  const supabase = window.supabaseClient;
  let currentUser = null;
  let projects = [];
  let tasks = [];
  let activeProjectId = null;
  let user = {name:"Usuário", avatar:""};

  // ---- PERSISTÊNCIA DO USUÁRIO ----
  function saveUserToStorage() {
    localStorage.setItem('userData', JSON.stringify(user));
  }

  function loadUserFromStorage() {
    const savedUser = localStorage.getItem('userData');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        user.name = parsedUser.name || "Usuário";
        user.avatar = parsedUser.avatar || "";
      } catch (e) {
        console.warn('Erro ao carregar dados do usuário:', e);
      }
    }
  }

  // Carrega dados do usuário salvos
  loadUserFromStorage();

  // ---- MOBILE MENU FUNCTIONALITY ----
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.querySelector('.projects-sidebar');
  const overlay = document.createElement('div');
  overlay.className = 'mobile-overlay';
  document.body.appendChild(overlay);

  function toggleMobileMenu() {
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
    
    if (sidebar.classList.contains('mobile-open')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  function closeMobileMenu() {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  mobileMenuBtn.addEventListener('click', toggleMobileMenu);
  overlay.addEventListener('click', closeMobileMenu);

  // Fechar menu ao clicar em um item de navegação (mobile)
  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeMobileMenu();
      }
    });
  });

  // ---- THEME BUTTON (Lua/Sol) ----
  const themeBtn = document.getElementById("theme-toggle-btn");
  const themeIcon = document.getElementById("theme-icon");
  function updateThemeIcon() {
    themeIcon.textContent = document.body.classList.contains("dark-mode") ? "dark_mode" : "light_mode";
  }
  themeBtn.onclick = () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkModeEnabled",document.body.classList.contains("dark-mode"));
    updateThemeIcon();
  };
  if(localStorage.getItem("darkModeEnabled")==='true') document.body.classList.add("dark-mode");
  updateThemeIcon();

  // ---- Navegação entre views ----
  document.querySelectorAll('.main-nav .nav-item > a[data-view]').forEach(link => {
    link.onclick = e => {
      e.preventDefault();
      document.querySelectorAll('.main-nav .nav-item').forEach(l=>l.classList.remove('active'));
      link.parentElement.classList.add('active');
      document.querySelectorAll('.main-view').forEach(v=>v.classList.add('view-hidden'));
      document.getElementById('view-'+link.dataset.view).classList.remove('view-hidden');
      if(link.dataset.view === "projects") renderTasks();
      if(link.dataset.view === "dashboard") renderDashboard();
    };
  });

  // ---- Projetos ----
  function renderProjects() {
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = '';
    projects.forEach(project => {
      const li = document.createElement('li');
      li.textContent = project.name;
      li.className = project.id === activeProjectId ? 'active-project' : '';
      li.onclick = () => { selectProject(project.id);}
      projectList.appendChild(li);
    });
  }
  function selectProject(id){
    activeProjectId = id;
    renderProjects();
    document.getElementById('current-project-title').textContent = projects.find(p=>p.id===activeProjectId)?.name || "Selecione um Projeto";
    document.querySelectorAll('.main-view').forEach(v=>v.classList.add('view-hidden'));
    document.getElementById('view-projects').classList.remove('view-hidden');
    renderTasks();
  }
  renderProjects();

  document.getElementById('project-form').onsubmit = async function(e){
    e.preventDefault();
    const name = document.getElementById('project-input').value.trim();
    if(!name || !currentUser) return;
    const { data, error } = await supabase.from('projects').insert({ name, user_id: currentUser.id }).select().single();
    if(error){ alert('Erro ao criar projeto'); return; }
    projects.unshift(data);
    activeProjectId = data.id;
    renderProjects();
    selectProject(data.id);
    document.getElementById('project-input').value="";
  };

  // ---- Utils ----
  function corPriority(priority){
    if(priority==='Baixa')return "task-priority-low";
    if(priority==='Média'||priority==='medium')return "task-priority-média";
    if(priority==='Alta'||priority==='high')return "task-priority-high";
    return "task-priority-média";
  }

  // LABEL DE VENCIMENTO (HOJE, AMANHÃ, ATRASADO, ...)
  function formatVencimentoLabel(dateStr) {
    if(!dateStr) return '';
    const [data,horaRaw] = dateStr.split('T');
    const [ano,mes,dia] = data.split('-').map(x=>parseInt(x,10));
    const target = new Date(ano,mes-1,dia);
    const now = new Date();
    target.setHours(0,0,0,0); now.setHours(0,0,0,0);
    const diffDias = Math.round((target - now)/86400000);
    let hora = '';
    if(horaRaw && horaRaw.length >= 5) hora = ', ' + horaRaw.slice(0,5);
    if(diffDias === 0) return `<span class="vencimento-label hoje">Hoje${hora}</span>`;
    if(diffDias === 1) return `<span class="vencimento-label amanha">Amanhã${hora}</span>`;
    if(diffDias < 0) return `<span class="vencimento-label atrasado">Atrasado${hora}</span>`;
    return `<span class="vencimento-label futuro">${("0"+dia).slice(-2)}/${("0"+mes).slice(-2)}${hora}</span>`;
  }

  // ---- Kanban/Tasks LIMPO (sem data de criação no card) ----
  function renderTasks() {
    const kanbanBoard = document.getElementById('kanban-board');
    kanbanBoard.innerHTML = '';
    if(!activeProjectId) return;
    ['A Fazer','Em Andamento','Concluído'].forEach(status=>{
      const col=document.createElement('div');
      col.className="kanban-column";
      col.dataset.status=status;
      col.innerHTML=`<h3>${status}</h3><div class="tasks-container"></div>`;
      const tc = col.querySelector('.tasks-container');
      tasks.filter(t=>t.projectId===activeProjectId&&t.status===status).forEach(task=>{
        const card=document.createElement('div');
        card.className='task-card'; card.setAttribute('draggable','true'); card.dataset.taskId=task.id;
        card.innerHTML=`
          <div class="task-title">
            <span class="task-priority-indicator ${corPriority(task.priority)}"></span>
            ${task.text}
            <span class="task-priority-label">${task.priority}</span>
            ${task.dueDate ? formatVencimentoLabel(task.dueDate) : ''}
          </div>
          <div class="task-actions">
            <button title="Editar" onclick="window.editTask('${task.id}')"><span class="material-symbols-outlined">edit</span></button>
          </div>`;
        tc.appendChild(card);
      });
      kanbanBoard.appendChild(col);
    });
    // Drag and drop
    let dragTaskId = null;
    document.querySelectorAll('.task-card').forEach(card=>{
      card.ondragstart = (e)=>{ dragTaskId = card.dataset.taskId; setTimeout(()=>card.classList.add('dragging'),1);}
      card.ondragend = (e)=>{ dragTaskId = null; card.classList.remove('dragging'); dndClear();}
    });
    function dndClear(){ document.querySelectorAll('.kanban-column').forEach(c=>c.classList.remove('drag-hover')); }
    document.querySelectorAll('.kanban-column').forEach(col=>{
      col.ondragover = (e)=>{e.preventDefault();dndClear();col.classList.add('drag-hover');};
      col.ondragleave = dndClear;
      col.ondrop = async function(e){
        e.preventDefault();
        if(!dragTaskId) return;
        const status = col.dataset.status;
        const task = tasks.find(t=>t.id===dragTaskId);
        if(task && task.status!==status){
          task.status = status;
          await supabase.from('tasks').update({ status }).eq('id', task.id);
          renderTasks();
        }
        dndClear();
      };
    });
    document.getElementById('task-counter').textContent = tasks.filter(t=>t.projectId===activeProjectId&&t.status!=='Concluído').length+" tarefas pendentes.";
  }

  // ---- Deletar tarefa ----
  window.deleteTask = async function(id) {
    if(confirm('Tem certeza que deseja deletar esta tarefa?')) {
      await supabase.from('tasks').delete().eq('id', id);
      tasks = tasks.filter(t => t.id !== id);
      renderTasks();
      if(typeof renderDashboard === "function") renderDashboard();
    }
  }

  // ---- Adicionar tarefa ----
  document.getElementById('task-form').onsubmit = async function(e){
    e.preventDefault();
    const text = document.getElementById('task-input').value.trim();
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value;
    if(!text||!activeProjectId||!currentUser) return;
    const payload = { user_id: currentUser.id, project_id: activeProjectId, text, status:'A Fazer', priority, comments:[], due_date: dueDate||null, desc: "" };
    const { data, error } = await supabase.from('tasks').insert(payload).select().single();
    if(error){ alert('Erro ao criar tarefa'); return; }
    tasks.push({ id:data.id, projectId:data.project_id, text:data.text, status:data.status, priority:data.priority, comments:data.comments||[], createdAt:data.created_at, dueDate:data.due_date||"", desc:data.desc||"" });
    document.getElementById('task-input').value="";
    document.getElementById('task-due-date').value="";
    renderTasks();
    if(typeof renderDashboard === "function") renderDashboard();
  };

  // ---- Editar tarefa + comentários + info criação NO MODAL ----
  window.editTask = (taskId) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const modal = document.createElement('div');
      modal.className = "task-edit-modal";
      modal.innerHTML = `
        <div class="modal-content">
          <label>Nome:</label>
          <input id="modal-task-text" value="${task.text}" />
          <label>Prioridade:</label>
          <select id="modal-task-priority">
            <option value="Baixa" ${task.priority === 'Baixa' ? 'selected' : ''}>Baixa</option>
            <option value="Média" ${task.priority === 'Média' ? 'selected' : ''}>Média</option>
            <option value="Alta" ${task.priority === 'Alta' ? 'selected' : ''}>Alta</option>
          </select>
          <label>Vencimento:</label>
          <input id="modal-task-duedate" type="date" value="${task.dueDate || ''}" />
          <div class="task-info">
            <small style="color:var(--text-secondary)">
              Criada em: ${(task.createdAt || '').replace('T', ' ').slice(0, 16)}
            </small>
          </div>
          <label>Observação:</label>
          <textarea id="modal-task-desc" placeholder="Descrição extra">${task.desc || ''}</textarea>
          <label>Comentários:</label>
          <div class="comment-list">${task.comments && task.comments.length ?
            task.comments.map(c => `<div class="comment-row"><span class="comment-author">Comentário:</span>${c}</div>`).join('')
            : '<div style="color:#888;">Sem comentários.</div>'}</div>
          <form id="modal-comment-form">
            <textarea id="comment-text" rows="2" placeholder="Adicionar comentário..."></textarea>
            <div class="actions">
              <button type="submit">Salvar</button>
              <button type="button" onclick="this.closest('.task-edit-modal').remove()">Cancelar</button>
              <button type="button" style="background:#ef4444;color:#fff;margin-left:auto;margin-top:0;margin-bottom:0;" onclick="window.deleteTask('${task.id}');this.closest('.task-edit-modal').remove();">Excluir tarefa</button>
            </div>
          </form>
        </div>`;
      modal.querySelector('#modal-comment-form').onsubmit = async e => {
        e.preventDefault();
        const txt = modal.querySelector('#comment-text').value.trim();
        if (txt) { task.comments = task.comments || []; task.comments.push(txt); }
        task.text = modal.querySelector('#modal-task-text').value;
        task.priority = modal.querySelector('#modal-task-priority').value;
        task.dueDate = modal.querySelector('#modal-task-duedate').value;
        task.desc = modal.querySelector('#modal-task-desc').value;
        await supabase.from('tasks').update({
          text: task.text,
          priority: task.priority,
          due_date: task.dueDate || null,
          desc: task.desc,
          comments: task.comments
        }).eq('id', task.id);
        modal.remove();
        renderTasks();
      };
      document.body.appendChild(modal);
    };    
  // ---- Dashboard moderno ----
  function renderDashboard() {
    document.getElementById('stat-projects').textContent = projects.length;
    document.getElementById('stat-tasks-done').textContent = tasks.filter(x=>x.status==='Concluído').length;
    document.getElementById('stat-tasks-todo').textContent = tasks.filter(x=>x.status!=='Concluído').length;
    const hoje = (new Date()).toISOString().slice(0,10);
    document.getElementById('stat-today').textContent = tasks.filter(x=>(x.createdAt||'').slice(0,10)===hoje).length;
    const pie = document.getElementById('dashboard-pie');
    if(window.dashboardPie) window.dashboardPie.destroy();
    const aFazer=tasks.filter(x=>x.status==='A Fazer').length;
    const andamento=tasks.filter(x=>x.status==='Em Andamento').length;
    const concluido=tasks.filter(x=>x.status==='Concluído').length;
    if((aFazer+andamento+concluido)===0){
      pie.style.display="none";
      document.getElementById('dashboard-empty-pie').style.display="block";
      return;
    }
    document.getElementById('dashboard-empty-pie').style.display="none";
    pie.style.display="block";
    window.dashboardPie = new Chart(pie, {
      type: 'doughnut',
      data: {
        labels: ['A Fazer','Em Andamento','Concluído'],
        datasets: [{
          data: [aFazer,andamento,concluido],
          backgroundColor: ['#3b82f6','#fbbf24','#22c55e'],
          borderWidth: 2
        }]
      },
      options: {responsive:true,plugins:{legend:{display:true,position:"bottom"}}}
    });
  }

  // ---- Usuário no topo/configurações ----
  function updateUserHeader() {
    const avatarEl = document.getElementById('user-avatar');
    avatarEl.textContent=user.name[0];
    avatarEl.style.backgroundImage=user.avatar?`url('${user.avatar}')`:"";
    avatarEl.style.backgroundSize=user.avatar?"cover":"";
    document.getElementById('user-name').textContent = user.name;
  }

  function updateUserForm() {
    // Atualiza os campos do formulário com os dados salvos
    document.getElementById('profile-name').value = user.name;
    if (user.avatar) {
      document.getElementById('profile-avatar-img').src = user.avatar;
    }
  }

  updateUserHeader();
  updateUserForm();
  document.getElementById('user-settings-form').onsubmit = function(e){
    e.preventDefault();
    user.name = document.getElementById('profile-name').value || "Usuário";
    user.avatar = document.getElementById("profile-avatar-img").getAttribute("src") || "";
    saveUserToStorage(); // Salva os dados no localStorage
    updateUserHeader();
    document.querySelectorAll('.main-view').forEach(v=>v.classList.add('view-hidden'));
    document.getElementById('view-home').classList.remove('view-hidden');
  };
  document.getElementById('profile-avatar-input').onchange = function(e){
    let file = this.files[0];
    if(file){
      let reader = new FileReader();
      reader.onload = ()=>{ document.getElementById("profile-avatar-img").src=reader.result;}
      reader.readAsDataURL(file);
    }
  };

  function getNowISO() {
    const now = new Date();
    const tz = now.getTimezoneOffset() * 60000;
    return new Date(now - tz).toISOString().slice(0,16);
  }

  document.getElementById('projects-toggle').onclick = (e)=>{
    e.preventDefault();
    document.getElementById('projects-cascade').classList.toggle('view-hidden');
    document.getElementById('arrow-projects').classList.toggle('opened');
  };

  // ---- Responsividade ----
  function handleResize() {
    if (window.innerWidth > 768) {
      closeMobileMenu();
    }
  }

  window.addEventListener('resize', handleResize);

  async function loadData(){
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    if(!currentUser) return;
    const { data: projData } = await supabase.from('projects').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    projects = projData || [];
    if(!activeProjectId && projects.length) activeProjectId = projects[0].id;
    const { data: taskData } = await supabase.from('tasks').select('*').eq('user_id', currentUser.id);
    tasks = (taskData||[]).map(r=>({ id:r.id, projectId:r.project_id, text:r.text, status:r.status, priority:r.priority, comments:r.comments||[], createdAt:r.created_at, dueDate:r.due_date||"", desc:r.desc||"" }));
    renderProjects();
    if(activeProjectId) selectProject(activeProjectId);
    if(typeof renderDashboard === "function") renderDashboard();
  }

  loadData();
});

// ---- TOUCH GESTURES ----
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
  touchStartY = e.changedTouches[0].screenY;
}

function handleTouchEnd(e) {
  touchEndX = e.changedTouches[0].screenX;
  touchEndY = e.changedTouches[0].screenY;
  handleSwipe();
}

function handleSwipe() {
  const swipeThreshold = 50; // Mínimo de pixels para considerar um swipe
  const diffX = touchStartX - touchEndX;
  const diffY = touchStartY - touchEndY;
  
  // Verifica se é um swipe horizontal (mais horizontal que vertical)
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
    if (diffX > 0) {
      // Swipe para esquerda - Abre menu mobile
      if (window.innerWidth <= 768 && !sidebar.classList.contains('mobile-open')) {
        toggleMobileMenu();
      }
    } else {
      // Swipe para direita - Fecha menu mobile
      if (window.innerWidth <= 768 && sidebar.classList.contains('mobile-open')) {
        closeMobileMenu();
      }
    }
  }
}

// Adiciona listeners de touch para swipe
document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchend', handleTouchEnd, false);

// ---- MELHORIAS DE TOUCH ----
// Previne zoom em inputs em dispositivos móveis
document.addEventListener('touchstart', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
    e.target.style.fontSize = '16px';
  }
}, { passive: true });

// Melhora feedback visual para touch
document.addEventListener('touchstart', function(e) {
  if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
    e.target.style.transform = 'scale(0.95)';
  }
}, { passive: true });

document.addEventListener('touchend', function(e) {
  if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
    e.target.style.transform = 'scale(1)';
  }
}, { passive: true });
