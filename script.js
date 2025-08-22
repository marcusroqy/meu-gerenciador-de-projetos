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
    
    const submitBtn = this.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    
    try {
      const { data, error } = await supabase.from('projects').insert({ name, user_id: currentUser.id }).select().single();
      if(error) throw error;
      
      projects.unshift(data);
      activeProjectId = data.id;
      renderProjects();
      selectProject(data.id);
      document.getElementById('project-input').value="";
      showSuccess('Projeto Criado', `O projeto "${name}" foi criado com sucesso!`);
    } catch (error) {
      showError('Erro', 'Não foi possível criar o projeto. Tente novamente.');
    } finally {
      setButtonLoading(submitBtn, false);
    }
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
    showConfirm(
      'Excluir Tarefa',
      'Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.',
      async () => {
        await supabase.from('tasks').delete().eq('id', id);
        tasks = tasks.filter(t => t.id !== id);
        renderTasks();
        if(typeof renderDashboard === "function") renderDashboard();
        showSuccess('Sucesso', 'Tarefa excluída com sucesso!');
      }
    );
  }

  // ---- Adicionar tarefa ----
  document.getElementById('task-form').onsubmit = async function(e){
    e.preventDefault();
    const text = document.getElementById('task-input').value.trim();
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value;
    if(!text||!activeProjectId||!currentUser) return;
    
    const submitBtn = this.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    
    try {
      const payload = { user_id: currentUser.id, project_id: activeProjectId, text, status:'A Fazer', priority, comments:[], due_date: dueDate||null, desc: "" };
      const { data, error } = await supabase.from('tasks').insert(payload).select().single();
      if(error) throw error;
      
      tasks.push({ id:data.id, projectId:data.project_id, text:data.text, status:data.status, priority:data.priority, comments:data.comments||[], createdAt:data.created_at, dueDate:data.due_date||"", desc:data.desc||"" });
      document.getElementById('task-input').value="";
      document.getElementById('task-due-date').value="";
      renderTasks();
      if(typeof renderDashboard === "function") renderDashboard();
      showSuccess('Tarefa Criada', `A tarefa "${text}" foi adicionada com sucesso!`);
    } catch (error) {
      showError('Erro', 'Não foi possível criar a tarefa. Tente novamente.');
    } finally {
      setButtonLoading(submitBtn, false);
    }
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
    
    const submitBtn = this.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);
    
    setTimeout(() => {
      user.name = document.getElementById('profile-name').value || "Usuário";
      user.avatar = document.getElementById("profile-avatar-img").getAttribute("src") || "";
      saveUserToStorage(); // Salva os dados no localStorage
      updateUserHeader();
      document.querySelectorAll('.main-view').forEach(v=>v.classList.add('view-hidden'));
      document.getElementById('view-home').classList.remove('view-hidden');
      setButtonLoading(submitBtn, false);
      showSuccess('Configurações Salvas', 'Suas informações foram atualizadas com sucesso!');
    }, 500); // Simula um pequeno delay para mostrar o loading
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

// ===== SISTEMA DE NOTIFICAÇÕES UX MELHORADO =====
function createToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function showToast(type, title, message, duration = 4000) {
  const container = createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info'
  };
  
  toast.innerHTML = `
    <span class="toast-icon material-symbols-outlined">${icons[type] || 'info'}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">
      <span class="material-symbols-outlined">close</span>
    </button>
  `;
  
  container.appendChild(toast);
  
  // Anima entrada
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Auto remove
  const autoRemove = setTimeout(() => removeToast(toast), duration);
  
  // Botão de fechar
  toast.querySelector('.toast-close').onclick = () => {
    clearTimeout(autoRemove);
    removeToast(toast);
  };
}

function removeToast(toast) {
  toast.classList.remove('show');
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
}

// Funções de conveniência
window.showSuccess = (title, message) => showToast('success', title, message);
window.showError = (title, message) => showToast('error', title, message);
window.showWarning = (title, message) => showToast('warning', title, message);
window.showInfo = (title, message) => showToast('info', title, message);

// Confirmação elegante
function showConfirm(title, message, onConfirm, onCancel) {
  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  dialog.innerHTML = `
    <div class="confirm-content">
      <div class="confirm-title">${title}</div>
      <div class="confirm-message">${message}</div>
      <div class="confirm-actions">
        <button class="confirm-btn confirm-no">Cancelar</button>
        <button class="confirm-btn confirm-yes">Confirmar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  setTimeout(() => dialog.classList.add('show'), 10);
  
  const remove = () => {
    dialog.classList.remove('show');
    setTimeout(() => {
      if (dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
      }
    }, 200);
  };
  
  dialog.querySelector('.confirm-yes').onclick = () => {
    remove();
    if (onConfirm) onConfirm();
  };
  
  dialog.querySelector('.confirm-no').onclick = () => {
    remove();
    if (onCancel) onCancel();
  };
  
  dialog.onclick = (e) => {
    if (e.target === dialog) {
      remove();
      if (onCancel) onCancel();
    }
  };
}

window.showConfirm = showConfirm;

// Loading states para botões
function setButtonLoading(button, loading = true) {
  if (loading) {
    button.classList.add('btn-loading');
    button.disabled = true;
  } else {
    button.classList.remove('btn-loading');
    button.disabled = false;
  }
}

// ===== SISTEMA DE EMAIL COM GMAIL API =====
const gmailConfig = {
  clientId: '263415738404-9cuie17gn2ulcea14co2gfa58d273eb5.apps.googleusercontent.com',
  apiKey: 'AIzaSyAzcBQ4WhkoAzC5BFmx659Xxpip5SKdZ5k',
  discoveryDoc: 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
  scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send'
};

const emailSystem = {
  currentFolder: 'inbox',
  isConnected: false,
  accessToken: null,
  userEmail: null,
  emails: [
    {
      id: 1,
      sender: 'João Silva',
      senderEmail: 'joao@empresa.com',
      subject: 'Reunião de Projeto - Amanhã 14h',
      preview: 'Olá! Gostaria de confirmar nossa reunião para discutir o andamento do projeto...',
      content: `
        <p>Olá!</p>
        <p>Gostaria de confirmar nossa reunião para discutir o andamento do projeto. Seguem os pontos principais:</p>
        <ul>
          <li>Revisão do cronograma</li>
          <li>Definição de próximas etapas</li>
          <li>Discussão sobre recursos necessários</li>
        </ul>
        <p>Por favor, confirme sua presença.</p>
        <p>Atenciosamente,<br>João Silva</p>
      `,
      time: 'há 2 horas',
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
      isRead: false,
      isStarred: false,
      folder: 'inbox'
    },
    {
      id: 2,
      sender: 'Maria Costa',
      senderEmail: 'maria@cliente.com',
      subject: 'Feedback sobre proposta',
      preview: 'Boa tarde! Revisei a proposta enviada e gostaria de fazer alguns comentários...',
      content: `
        <p>Boa tarde!</p>
        <p>Revisei a proposta enviada e gostaria de fazer alguns comentários:</p>
        <p>1. O prazo está adequado para nossas necessidades<br>
        2. Os valores estão dentro do orçamento previsto<br>
        3. Gostaríamos de incluir mais uma funcionalidade</p>
        <p>Podemos agendar uma conversa para discutir os detalhes?</p>
        <p>Obrigada!</p>
      `,
      time: 'há 5 horas',
      timestamp: Date.now() - 5 * 60 * 60 * 1000,
      isRead: true,
      isStarred: true,
      folder: 'inbox'
    },
    {
      id: 3,
      sender: 'Carlos Mendes',
      senderEmail: 'carlos@fornecedor.com',
      subject: 'Atualização de preços - 2024',
      preview: 'Informamos que nossos preços foram atualizados para o próximo ano...',
      content: `
        <p>Prezados,</p>
        <p>Informamos que nossos preços foram atualizados para o próximo ano.</p>
        <p>Segue em anexo a nova tabela de preços que entra em vigor a partir de janeiro de 2024.</p>
        <p>Qualquer dúvida, estamos à disposição.</p>
        <p>Atenciosamente,<br>Carlos Mendes</p>
      `,
      time: 'ontem',
      timestamp: Date.now() - 24 * 60 * 60 * 1000,
      isRead: true,
      isStarred: false,
      folder: 'inbox'
    },
    {
      id: 4,
      sender: 'Ana Oliveira',
      senderEmail: 'ana@empresa.com',
      subject: 'Relatório mensal finalizado',
      preview: 'O relatório mensal foi finalizado e está disponível para download...',
      content: `
        <p>Equipe,</p>
        <p>O relatório mensal foi finalizado e está disponível para download no sistema.</p>
        <p>Principais destaques:</p>
        <ul>
          <li>Crescimento de 15% em relação ao mês anterior</li>
          <li>3 novos clientes adquiridos</li>
          <li>Taxa de satisfação de 98%</li>
        </ul>
        <p>Parabéns pelo excelente trabalho!</p>
      `,
      time: '2 dias',
      timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
      isRead: false,
      isStarred: true,
      folder: 'inbox'
    }
  ],

  async init() {
    this.checkConnection();
    if (this.isConnected) {
      await this.loadGmailEmails();
    } else {
      this.showDisconnectedState();
    }
    this.bindEvents();
    this.updateStats();
  },

  checkConnection() {
    const savedToken = localStorage.getItem('gmail_access_token');
    const savedEmail = localStorage.getItem('gmail_user_email');
    
    if (savedToken && savedEmail) {
      this.accessToken = savedToken;
      this.userEmail = savedEmail;
      this.isConnected = true;
      this.showConnectedState();
    }
  },

  showConnectedState() {
    document.getElementById('connect-gmail-btn').style.display = 'none';
    document.getElementById('compose-email-btn').style.display = 'flex';
    document.getElementById('refresh-emails-btn').style.display = 'flex';
    document.getElementById('disconnect-gmail-btn').style.display = 'flex';
    document.getElementById('email-connection-status').style.display = 'flex';
    document.getElementById('connected-email').textContent = this.userEmail;
  },

  showDisconnectedState() {
    document.getElementById('connect-gmail-btn').style.display = 'flex';
    document.getElementById('compose-email-btn').style.display = 'none';
    document.getElementById('refresh-emails-btn').style.display = 'none';
    document.getElementById('disconnect-gmail-btn').style.display = 'none';
    document.getElementById('email-connection-status').style.display = 'none';
    
    const emailList = document.getElementById('email-list');
    
    // Verificar se as APIs do Google estão disponíveis
    const googleApiStatus = typeof gapi !== 'undefined' ? '✅ Carregada' : '❌ Não carregada';
    const googleIdentityStatus = typeof google !== 'undefined' ? '✅ Carregada' : '❌ Não carregada';
    
    emailList.innerHTML = `
      <div class="email-disconnected-state">
        <span class="material-symbols-outlined">link_off</span>
        <h3>Conecte sua conta Gmail</h3>
        <p>Para visualizar seus emails reais, conecte sua conta do Gmail clicando no botão "Conectar Gmail" acima.</p>
        <p><small>Seus dados ficam seguros - usamos OAuth2 do Google.</small></p>
        <div style="margin-top: 20px; padding: 12px; background: var(--bg-hover); border-radius: 8px; font-size: 12px;">
          <strong>Status das APIs:</strong><br>
          Google API (gapi): ${googleApiStatus}<br>
          Google Identity: ${googleIdentityStatus}<br>
          Client ID: ${gmailConfig.clientId ? '✅ Configurado' : '❌ Não configurado'}<br>
          API Key: ${gmailConfig.apiKey ? '✅ Configurado' : '❌ Não configurado'}
        </div>
      </div>
    `;
  },

  async connectGmail() {
    try {
      showInfo('Conectando', 'Aguarde enquanto conectamos ao Gmail...');
      
      console.log('Tentando conectar Gmail...');
      console.log('Client ID:', gmailConfig.clientId);
      console.log('API Key configurada:', gmailConfig.apiKey ? 'Sim' : 'Não');
      
      // Verificar se os scripts Google foram carregados
      if (typeof gapi === 'undefined') {
        throw new Error('Google API não foi carregada. Verifique sua conexão com a internet.');
      }
      
      // Inicializar APIs do Google
      console.log('Inicializando Google API...');
      await this.initializeGoogleAPI();
      console.log('Google API inicializada com sucesso');
      
      // Realizar autenticação OAuth2
      console.log('Iniciando autenticação...');
      await this.authenticateUser();
      console.log('Autenticação realizada com sucesso');
      
      showSuccess('Gmail Conectado', 'Sua conta foi conectada com sucesso!');
      this.isConnected = true;
      this.showConnectedState();
      await this.loadGmailEmails();
      
    } catch (error) {
      console.error('Erro detalhado ao conectar Gmail:', error);
      let errorMessage = 'Não foi possível conectar ao Gmail.';
      
      if (error.message.includes('popup_blocked')) {
        errorMessage = 'Pop-up bloqueado. Permita pop-ups para este site e tente novamente.';
      } else if (error.message.includes('access_denied')) {
        errorMessage = 'Acesso negado. Você precisa autorizar o aplicativo para acessar seus emails.';
      } else if (error.message.includes('invalid_client')) {
        errorMessage = 'Client ID inválido. Verifique a configuração no Google Cloud Console.';
      } else if (error.message.includes('redirect_uri_mismatch')) {
        errorMessage = 'URL não autorizada. Configure as origens autorizadas no Google Cloud Console.';
      }
      
      showError('Erro de Conexão', errorMessage);
    }
  },

  async initializeGoogleAPI() {
    return new Promise((resolve, reject) => {
      if (typeof gapi === 'undefined') {
        reject(new Error('Google API não carregada'));
        return;
      }

      // Usar apenas a parte client, sem auth2 para evitar CORS
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            apiKey: gmailConfig.apiKey,
            discoveryDocs: [gmailConfig.discoveryDoc]
          });
          
          console.log('gapi.client inicializado com sucesso');
          resolve();
        } catch (error) {
          console.error('Erro detalhado:', error);
          reject(error);
        }
      });
    });
  },

  async authenticateUser() {
    return new Promise((resolve, reject) => {
      // Usar a nova Google Identity API
      if (typeof google === 'undefined' || !google.accounts) {
        reject(new Error('Google Identity API não carregada'));
        return;
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: gmailConfig.clientId,
        scope: gmailConfig.scopes,
        prompt: '',
        callback: (response) => {
          console.log('Resposta do OAuth:', response);
          
          if (response.error) {
            console.error('Erro OAuth:', response.error);
            reject(new Error(response.error));
            return;
          }
          
          if (!response.access_token) {
            console.error('Token não recebido');
            reject(new Error('Token de acesso não recebido'));
            return;
          }
          
          this.accessToken = response.access_token;
          console.log('Token recebido com sucesso');
          
          // Buscar info do usuário
          this.getUserInfo().then(() => {
            // Salvar no localStorage
            localStorage.setItem('gmail_access_token', this.accessToken);
            localStorage.setItem('gmail_user_email', this.userEmail);
            console.log('Autenticação completa!');
            resolve();
          }).catch(reject);
        },
        error_callback: (error) => {
          console.error('Erro no callback:', error);
          reject(new Error('Erro na autenticação: ' + error.message));
        }
      });

      client.requestAccessToken();
    });
  },

  async getUserInfo() {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao buscar informações do usuário');
      }
      
      const userInfo = await response.json();
      this.userEmail = userInfo.email;
      
    } catch (error) {
      console.error('Erro ao buscar info do usuário:', error);
      this.userEmail = 'usuario@gmail.com'; // Fallback
    }
  },

  async loadGmailEmails() {
    try {
      if (!this.accessToken) {
        throw new Error('Token de acesso não disponível');
      }

      showInfo('Carregando', 'Sincronizando emails do Gmail...');

      // Buscar lista de emails
      const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=10&labelIds=INBOX`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar emails');
      }

      const data = await response.json();
      
      if (data.messages) {
        // Buscar detalhes de cada email
        const emailPromises = data.messages.slice(0, 10).map(msg => this.getEmailDetails(msg.id));
        const emailDetails = await Promise.all(emailPromises);
        
        this.emails = emailDetails.filter(email => email !== null);
        this.renderEmails();
        showSuccess('Gmail', `${this.emails.length} emails carregados com sucesso!`);
      } else {
        this.emails = [];
        this.renderEmails();
        showInfo('Gmail', 'Nenhum email encontrado na caixa de entrada.');
      }

    } catch (error) {
      console.error('Erro ao carregar emails:', error);
      showError('Erro', 'Não foi possível carregar os emails. Verifique sua conexão.');
      
      // Se token expirou, desconectar
      if (error.message.includes('401') || error.message.includes('Token')) {
        this.disconnectGmail();
      }
    }
  },

  async getEmailDetails(messageId) {
    try {
      const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      const message = await response.json();
      
      // Extrair dados do email
      const headers = message.payload.headers;
      const getHeader = (name) => {
        const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return header ? header.value : '';
      };

      const subject = getHeader('Subject') || 'Sem assunto';
      const from = getHeader('From');
      const date = getHeader('Date');
      
      // Extrair nome e email do remetente
      const senderMatch = from.match(/^(.*?)\s*<(.+)>$/) || from.match(/^(.+)$/);
      const senderName = senderMatch ? (senderMatch[1] || senderMatch[0]).replace(/"/g, '').trim() : 'Desconhecido';
      const senderEmail = senderMatch && senderMatch[2] ? senderMatch[2] : from;

      // Extrair conteúdo do email
      let content = this.extractEmailContent(message.payload);
      const preview = this.createPreview(content);

      // Verificar se foi lido
      const isRead = !message.labelIds.includes('UNREAD');

      return {
        id: messageId,
        sender: senderName,
        senderEmail: senderEmail,
        subject: subject,
        preview: preview,
        content: content,
        time: this.formatDate(date),
        timestamp: new Date(date).getTime(),
        isRead: isRead,
        isStarred: message.labelIds.includes('STARRED'),
        folder: 'inbox',
        gmailId: messageId
      };

    } catch (error) {
      console.error('Erro ao buscar detalhes do email:', error);
      return null;
    }
  },

  extractEmailContent(payload) {
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body.data) {
          return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
        if (part.mimeType === 'text/plain' && part.body.data) {
          const plainText = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          return plainText.replace(/\n/g, '<br>');
        }
      }
    } else if (payload.body.data) {
      if (payload.mimeType === 'text/html') {
        return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else {
        const plainText = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        return plainText.replace(/\n/g, '<br>');
      }
    }
    return 'Conteúdo não disponível';
  },

  createPreview(content) {
    // Remove HTML tags e pega primeiros 120 caracteres
    const textContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return textContent.length > 120 ? textContent.substring(0, 120) + '...' : textContent;
  },

  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = now - date;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffTime / (1000 * 60));

      if (diffMinutes < 60) {
        return `há ${diffMinutes} min`;
      } else if (diffHours < 24) {
        return `há ${diffHours}h`;
      } else if (diffDays === 1) {
        return 'ontem';
      } else if (diffDays < 7) {
        return `${diffDays} dias`;
      } else {
        return date.toLocaleDateString('pt-BR');
      }
    } catch (error) {
      return 'Data inválida';
    }
  },

  disconnectGmail() {
    // Limpar dados salvos
    localStorage.removeItem('gmail_access_token');
    localStorage.removeItem('gmail_user_email');
    
    // Resetar estado
    this.isConnected = false;
    this.accessToken = null;
    this.userEmail = null;
    this.emails = [];
    
    // Atualizar UI
    this.showDisconnectedState();
    this.updateStats();
    
    showSuccess('Gmail', 'Conta desconectada com sucesso!');
  },

  bindEvents() {
    // Navegação entre pastas
    document.querySelectorAll('.email-folder').forEach(folder => {
      folder.addEventListener('click', (e) => {
        const folderType = e.currentTarget.dataset.folder;
        this.switchFolder(folderType);
      });
    });

    // Busca
    const searchInput = document.getElementById('email-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchEmails(e.target.value);
      });
    }

    // Botões de ação
    const connectBtn = document.getElementById('connect-gmail-btn');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => {
        this.connectGmail();
      });
    }

    const disconnectBtn = document.getElementById('disconnect-gmail-btn');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => {
        showConfirm(
          'Desconectar Gmail',
          'Tem certeza que deseja desconectar sua conta do Gmail?',
          () => {
            this.disconnectGmail();
          }
        );
      });
    }

    const composeBtn = document.getElementById('compose-email-btn');
    if (composeBtn) {
      composeBtn.addEventListener('click', () => {
        this.composeEmail();
      });
    }

    const refreshBtn = document.getElementById('refresh-emails-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refreshEmails();
      });
    }

    const testBtn = document.getElementById('test-apis-btn');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        this.testAPIs();
      });
    }
  },

  switchFolder(folderType) {
    this.currentFolder = folderType;
    
    // Atualizar UI das pastas
    document.querySelectorAll('.email-folder').forEach(f => f.classList.remove('active'));
    document.querySelector(`[data-folder="${folderType}"]`).classList.add('active');
    
    this.renderEmails();
  },

  getEmailsForFolder(folder) {
    switch(folder) {
      case 'inbox':
        return this.emails.filter(e => e.folder === 'inbox');
      case 'sent':
        return []; // Simulado - vazio por enquanto
      case 'starred':
        return this.emails.filter(e => e.isStarred);
      case 'drafts':
        return []; // Simulado - vazio por enquanto
      case 'trash':
        return []; // Simulado - vazio por enquanto
      default:
        return this.emails;
    }
  },

  renderEmails() {
    const emailList = document.getElementById('email-list');
    if (!emailList) return;

    const emails = this.getEmailsForFolder(this.currentFolder);
    
    if (emails.length === 0) {
      emailList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <span class="material-symbols-outlined" style="font-size: 48px; margin-bottom: 16px; display: block;">inbox</span>
          <p>Nenhum email encontrado</p>
        </div>
      `;
      return;
    }

    emailList.innerHTML = emails.map(email => `
      <div class="email-item ${!email.isRead ? 'unread' : ''}" onclick="emailSystem.openEmail(${email.id})">
        <div class="email-avatar">${email.sender.charAt(0)}</div>
        <div class="email-info">
          <div class="email-sender">${email.sender}</div>
          <div class="email-subject">${email.subject}</div>
          <div class="email-preview">${email.preview}</div>
        </div>
        <div class="email-meta">
          <div class="email-time">${email.time}</div>
          <div class="email-actions-mini">
            <button class="email-action-mini" onclick="event.stopPropagation(); emailSystem.toggleStar(${email.id})" title="${email.isStarred ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
              <span class="material-symbols-outlined">${email.isStarred ? 'star' : 'star_border'}</span>
            </button>
            <button class="email-action-mini" onclick="event.stopPropagation(); emailSystem.deleteEmail(${email.id})" title="Excluir">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  openEmail(emailId) {
    const email = this.emails.find(e => e.id === emailId);
    if (!email) return;

    // Marcar como lido
    email.isRead = true;
    this.updateStats();
    this.renderEmails();

    // Criar modal
    const modal = document.createElement('div');
    modal.className = 'email-modal';
    modal.innerHTML = `
      <div class="email-modal-content">
        <div class="email-modal-header">
          <div class="email-modal-title">${email.subject}</div>
          <button class="email-modal-close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="email-modal-body">
          <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color);">
            <strong>De:</strong> ${email.sender} &lt;${email.senderEmail}&gt;<br>
            <strong>Assunto:</strong> ${email.subject}<br>
            <strong>Data:</strong> ${email.time}
          </div>
          <div style="line-height: 1.6;">
            ${email.content}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    // Fechar modal
    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 200);
    };

    modal.querySelector('.email-modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  },

  toggleStar(emailId) {
    const email = this.emails.find(e => e.id === emailId);
    if (email) {
      email.isStarred = !email.isStarred;
      this.updateStats();
      this.renderEmails();
      showSuccess('Email', email.isStarred ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
    }
  },

  deleteEmail(emailId) {
    showConfirm(
      'Excluir Email',
      'Tem certeza que deseja excluir este email?',
      () => {
        this.emails = this.emails.filter(e => e.id !== emailId);
        this.updateStats();
        this.renderEmails();
        showSuccess('Email', 'Email excluído com sucesso');
      }
    );
  },

  searchEmails(query) {
    if (!query.trim()) {
      this.renderEmails();
      return;
    }

    const emailList = document.getElementById('email-list');
    const filteredEmails = this.getEmailsForFolder(this.currentFolder).filter(email => 
      email.sender.toLowerCase().includes(query.toLowerCase()) ||
      email.subject.toLowerCase().includes(query.toLowerCase()) ||
      email.preview.toLowerCase().includes(query.toLowerCase())
    );

    if (filteredEmails.length === 0) {
      emailList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <span class="material-symbols-outlined" style="font-size: 48px; margin-bottom: 16px; display: block;">search_off</span>
          <p>Nenhum email encontrado para "${query}"</p>
        </div>
      `;
      return;
    }

    emailList.innerHTML = filteredEmails.map(email => `
      <div class="email-item ${!email.isRead ? 'unread' : ''}" onclick="emailSystem.openEmail(${email.id})">
        <div class="email-avatar">${email.sender.charAt(0)}</div>
        <div class="email-info">
          <div class="email-sender">${email.sender}</div>
          <div class="email-subject">${email.subject}</div>
          <div class="email-preview">${email.preview}</div>
        </div>
        <div class="email-meta">
          <div class="email-time">${email.time}</div>
          <div class="email-actions-mini">
            <button class="email-action-mini" onclick="event.stopPropagation(); emailSystem.toggleStar(${email.id})">
              <span class="material-symbols-outlined">${email.isStarred ? 'star' : 'star_border'}</span>
            </button>
            <button class="email-action-mini" onclick="event.stopPropagation(); emailSystem.deleteEmail(${email.id})">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  composeEmail() {
    showInfo('Novo Email', 'Funcionalidade de composição será implementada em breve!');
  },

  async refreshEmails() {
    const btn = document.getElementById('refresh-emails-btn');
    setButtonLoading(btn, true);
    
    try {
      if (this.isConnected) {
        await this.loadGmailEmails();
      } else {
        this.renderEmails();
        showSuccess('Emails', 'Caixa de entrada atualizada!');
      }
    } catch (error) {
      showError('Erro', 'Não foi possível atualizar os emails.');
    } finally {
      setButtonLoading(btn, false);
    }
  },

  updateStats() {
    const unreadCount = this.emails.filter(e => !e.isRead && e.folder === 'inbox').length;
    const starredCount = this.emails.filter(e => e.isStarred).length;
    
    document.getElementById('inbox-count').textContent = unreadCount;
    document.getElementById('starred-count').textContent = starredCount;
    
    // Atualizar contadores nas pastas
    const inboxFolder = document.querySelector('[data-folder="inbox"] .folder-count');
    const starredFolder = document.querySelector('[data-folder="starred"] .folder-count');
    
    if (inboxFolder) inboxFolder.textContent = unreadCount;
    if (starredFolder) starredFolder.textContent = starredCount;
  },

  testAPIs() {
    console.clear();
    console.log('=== TESTE DAS APIS DO GOOGLE (NOVA VERSÃO) ===');
    
    // Teste 1: Scripts carregados
    console.log('1. Scripts carregados:');
    console.log('   - gapi:', typeof gapi !== 'undefined' ? '✅ OK' : '❌ ERRO');
    console.log('   - google:', typeof google !== 'undefined' ? '✅ OK' : '❌ ERRO');
    console.log('   - google.accounts:', typeof google !== 'undefined' && google.accounts ? '✅ OK' : '❌ ERRO');
    
    // Teste 2: Configuração
    console.log('2. Configuração:');
    console.log('   - Client ID:', gmailConfig.clientId);
    console.log('   - API Key:', gmailConfig.apiKey ? 'Configurada' : 'Não configurada');
    
    // Teste 3: URL atual
    console.log('3. URL atual:', window.location.href);
    
    // Teste 4: Tentar carregar gapi (apenas client)
    if (typeof gapi !== 'undefined') {
      console.log('4. Testando gapi.load (client apenas)...');
      try {
        gapi.load('client', () => {
          console.log('   ✅ gapi.load funcionou');
          
          // Teste 5: Tentar inicializar (sem auth2)
          gapi.client.init({
            apiKey: gmailConfig.apiKey,
            discoveryDocs: [gmailConfig.discoveryDoc]
          }).then(() => {
            console.log('   ✅ gapi.client.init funcionou');
            
            // Teste 6: Google Identity API
            if (typeof google !== 'undefined' && google.accounts) {
              console.log('   ✅ Google Identity API disponível');
              showSuccess('APIs', 'Todas as APIs estão funcionando! Pronto para conectar.');
            } else {
              console.log('   ❌ Google Identity API não disponível');
              showWarning('APIs', 'gapi OK, mas Google Identity faltando');
            }
          }).catch((error) => {
            console.log('   ❌ gapi.client.init falhou:', error);
            showError('APIs', 'Erro na inicialização: ' + (error.error || error.message));
          });
        });
      } catch (error) {
        console.log('   ❌ gapi.load falhou:', error);
        showError('APIs', 'Erro ao carregar APIs: ' + error.message);
      }
    } else {
      console.log('4. ❌ gapi não está disponível');
      showError('APIs', 'Google API não foi carregada. Verifique sua conexão.');
    }
    
    showInfo('Teste de APIs', 'Executando testes... Verifique o console (F12)');
  }
};

// Inicializar sistema de email quando a view for acessada
document.addEventListener('DOMContentLoaded', () => {
  // Detectar quando a view de email é aberta
  const originalNavigation = document.querySelectorAll('.main-nav .nav-item > a[data-view]');
  originalNavigation.forEach(link => {
    const originalClick = link.onclick;
    link.onclick = function(e) {
      if (originalClick) originalClick.call(this, e);
      if (this.dataset.view === 'email') {
        setTimeout(() => emailSystem.init(), 100);
      }
    };
  });
});

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
