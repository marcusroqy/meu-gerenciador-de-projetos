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
    
    // Verificar também se há dados do Google
    const googleUser = localStorage.getItem('user');
    if (googleUser) {
      try {
        const userData = JSON.parse(googleUser);
        if (userData.provider === 'google') {
          user.name = userData.name || user.name;
          user.avatar = userData.avatar || user.avatar;
          user.email = userData.email;
          user.provider = 'google';
          
          // Atualizar header com avatar do Google
          updateUserHeaderWithGoogle(userData);
        }
      } catch (e) {
        console.warn('Erro ao carregar dados do Google:', e);
      }
    }
  }

  function updateUserHeaderWithGoogle(userData) {
    // Aguardar o DOM estar pronto
    setTimeout(() => {
      const avatarElement = document.querySelector('#user-avatar');
      const nameElement = document.querySelector('#user-name');
      
      console.log('Atualizando header com dados do Google:', userData);
      
      if (avatarElement && userData.avatar) {
        // Criar elemento de imagem para avatar do Google
        avatarElement.innerHTML = `<img src="${userData.avatar}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-primary);">`;
        console.log('Avatar do Google aplicado');
      }
      
      if (nameElement && userData.name) {
        nameElement.textContent = userData.name;
        console.log('Nome do Google aplicado:', userData.name);
      }
    }, 100);
  }

  // Carrega dados do usuário salvos
  loadUserFromStorage();
  
  // Aplicar dados do Google quando DOM carregar
  document.addEventListener('DOMContentLoaded', () => {
    const googleUser = localStorage.getItem('user');
    if (googleUser) {
      try {
        const userData = JSON.parse(googleUser);
        if (userData.provider === 'google') {
          updateUserHeaderWithGoogle(userData);
        }
      } catch (e) {
        console.warn('Erro ao aplicar dados do Google no DOM:', e);
      }
    }
  });
  
  // ---- FUNÇÃO PARA MOSTRAR VISUALIZAÇÕES ----
  function showView(viewId) {
    // Esconder todas as visualizações
    document.querySelectorAll('.main-view').forEach(v => v.classList.add('view-hidden'));
    
    // Mostrar a visualização solicitada
    const targetView = document.getElementById(viewId);
    if (targetView) {
      targetView.classList.remove('view-hidden');
      
      // Atualizar navegação ativa
      document.querySelectorAll('.main-nav .nav-item').forEach(item => item.classList.remove('active'));
      const navItem = document.querySelector(`[data-view="${viewId.replace('view-', '')}"]`);
      if (navItem) {
        navItem.parentElement.classList.add('active');
      }
      
      // Executar funções específicas baseadas na visualização
      if (viewId === 'view-projects') {
        renderTasks();
      } else if (viewId === 'view-dashboard') {
        renderDashboard();
      } else if (viewId === 'view-email') {
        // Verificar se Gmail está conectado
        if (window.emailSystem && window.emailSystem.isConnected) {
          window.loadGmailEmails();
        }
      }
      
      console.log('Visualização alterada para:', viewId);
    } else {
      console.warn('Visualização não encontrada:', viewId);
    }
  }
  
  // Tornar função global para uso no index.html
  window.showView = showView;

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
      if (currentUser.provider === 'google') {
        // Para usuários Google, salvar no localStorage
        const newProject = {
          id: Date.now().toString(),
          name: name,
          user_id: currentUser.id,
          created_at: new Date().toISOString()
        };
        
        projects.unshift(newProject);
        activeProjectId = newProject.id;
        
        // Salvar no localStorage
        localStorage.setItem(`projects_${currentUser.email}`, JSON.stringify(projects));
        console.log('Projeto salvo no localStorage:', newProject);
        
        renderProjects();
        selectProject(newProject.id);
        document.getElementById('project-input').value="";
        showSuccess('Projeto Criado', `O projeto "${name}" foi criado com sucesso!`);
      } else {
        // Para usuários Supabase, salvar no banco
        const { data, error } = await supabase.from('projects').insert({ name, user_id: currentUser.id }).select().single();
        if(error) throw error;
        
        projects.unshift(data);
        activeProjectId = data.id;
        renderProjects();
        selectProject(data.id);
        document.getElementById('project-input').value="";
        showSuccess('Projeto Criado', `O projeto "${name}" foi criado com sucesso!`);
      }
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
          
          if (currentUser.provider === 'google') {
            // Para usuários Google, salvar no localStorage
            localStorage.setItem(`tasks_${currentUser.email}`, JSON.stringify(tasks));
            console.log('Status da tarefa atualizado no localStorage:', task.id, status);
          } else {
            // Para usuários Supabase, atualizar no banco
            await supabase.from('tasks').update({ status }).eq('id', task.id);
          }
          
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
      if (currentUser.provider === 'google') {
        // Para usuários Google, salvar no localStorage
        const newTask = {
          id: Date.now().toString(),
          user_id: currentUser.id,
          project_id: activeProjectId,
          text: text,
          status: 'A Fazer',
          priority: priority,
          comments: [],
          due_date: dueDate || null,
          desc: "",
          created_at: new Date().toISOString()
        };
        
        const taskForArray = { 
          id: newTask.id, 
          projectId: newTask.project_id, 
          text: newTask.text, 
          status: newTask.status, 
          priority: newTask.priority, 
          comments: newTask.comments, 
          createdAt: newTask.created_at, 
          dueDate: newTask.due_date || "", 
          desc: newTask.desc 
        };
        
        tasks.push(taskForArray);
        
        // Salvar no localStorage
        localStorage.setItem(`tasks_${currentUser.email}`, JSON.stringify(tasks));
        console.log('Tarefa salva no localStorage:', newTask);
        
        document.getElementById('task-input').value="";
        document.getElementById('task-due-date').value="";
        renderTasks();
        if(typeof renderDashboard === "function") renderDashboard();
        showSuccess('Tarefa Criada', `A tarefa "${text}" foi adicionada com sucesso!`);
      } else {
        // Para usuários Supabase, salvar no banco
        const payload = { user_id: currentUser.id, project_id: activeProjectId, text, status:'A Fazer', priority, comments:[], due_date: dueDate||null, desc: "" };
        const { data, error } = await supabase.from('tasks').insert(payload).select().single();
        if(error) throw error;
        
        tasks.push({ id:data.id, projectId:data.project_id, text:data.text, status:data.status, priority:data.priority, comments:data.comments||[], createdAt:data.created_at, dueDate:data.due_date||"", desc:data.desc||"" });
        document.getElementById('task-input').value="";
        document.getElementById('task-due-date').value="";
        renderTasks();
        if(typeof renderDashboard === "function") renderDashboard();
        showSuccess('Tarefa Criada', `A tarefa "${text}" foi adicionada com sucesso!`);
      }
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
        
        if (currentUser.provider === 'google') {
          // Para usuários Google, salvar no localStorage
          localStorage.setItem(`tasks_${currentUser.email}`, JSON.stringify(tasks));
          console.log('Tarefa atualizada no localStorage:', task.id);
        } else {
          // Para usuários Supabase, atualizar no banco
          await supabase.from('tasks').update({
            text: task.text,
            priority: task.priority,
            due_date: task.dueDate || null,
            desc: task.desc,
            comments: task.comments
          }).eq('id', task.id);
        }
        
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
    // Verificar se há sessão do Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Usuário logado via Supabase
      currentUser = session.user;
      console.log('Usuário carregado via Supabase:', currentUser);
    } else {
      // Verificar se há login do Google
      const googleUser = localStorage.getItem('user');
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      
      if (googleUser && isLoggedIn === 'true') {
        try {
          const userData = JSON.parse(googleUser);
          // Criar usuário simulado para Google
          currentUser = {
            id: userData.email || 'google_user_' + Date.now(),
            email: userData.email,
            name: userData.name,
            provider: 'google'
          };
          console.log('Usuário Google simulado criado:', currentUser);
        } catch (error) {
          console.error('Erro ao processar dados do Google:', error);
          return;
        }
      } else {
        // Nenhum usuário logado
        console.log('Nenhum usuário autenticado');
        return;
      }
    }
    
    if(!currentUser) return;
    
    // Carregar dados do usuário
    try {
      if (currentUser.provider === 'google') {
        // Para usuários Google, usar localStorage para projetos e tarefas
        await loadGoogleUserData();
      } else {
        // Para usuários Supabase, carregar do banco
        await loadSupabaseUserData();
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  }

  async function loadSupabaseUserData() {
    const { data: projData } = await supabase.from('projects').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    projects = projData || [];
    if(!activeProjectId && projects.length) activeProjectId = projects[0].id;
    const { data: taskData } = await supabase.from('tasks').select('*').eq('user_id', currentUser.id);
    tasks = (taskData||[]).map(r=>({ id:r.id, projectId:r.project_id, text:r.text, status:r.status, priority:r.priority, comments:r.comments||[], createdAt:r.created_at, dueDate:r.due_date||"", desc:r.desc||"" }));
    renderProjects();
    if(activeProjectId) selectProject(activeProjectId);
    if(typeof renderDashboard === "function") renderDashboard();
  }

  async function loadGoogleUserData() {
    // Carregar projetos e tarefas do localStorage para usuários Google
    const savedProjects = localStorage.getItem(`projects_${currentUser.email}`);
    const savedTasks = localStorage.getItem(`tasks_${currentUser.email}`);
    
    if (savedProjects) {
      try {
        projects = JSON.parse(savedProjects);
        console.log('Projetos carregados do localStorage:', projects);
      } catch (error) {
        console.error('Erro ao carregar projetos:', error);
        projects = [];
      }
    }
    
    if (savedTasks) {
      try {
        tasks = JSON.parse(savedTasks);
        console.log('Tarefas carregadas do localStorage:', tasks);
      } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
        tasks = [];
      }
    }
    
    if(!activeProjectId && projects.length) activeProjectId = projects[0].id;
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
  scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
};

const emailSystem = {
  currentFolder: 'inbox',
  isConnected: false,
  accessToken: null,
  userEmail: null,
  emails: [],
  allEmails: [], // Todos os emails carregados
  currentPage: 1,
  emailsPerPage: 10,
  importantEmails: [], // Emails marcados como importantes
  isLoading: false,
  
  // Emails de exemplo para demonstração
  demoEmails: [
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
      folder: 'inbox',
      isImportant: false
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
        folder: 'inbox',
        isImportant: true
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
        folder: 'inbox',
        isImportant: false
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
        folder: 'inbox',
                isImportant: true
      },
      {
        id: 5,
        sender: 'Facebook',
        senderEmail: 'notification@facebook.com',
        subject: 'Você tem novas notificações',
        preview: 'João Silva comentou na sua foto. Maria Costa curtiu seu post...',
        content: `
          <p>Olá!</p>
          <p>Você tem novas atividades no Facebook:</p>
          <ul>
            <li>João Silva comentou na sua foto</li>
            <li>Maria Costa curtiu seu post</li>
            <li>Pedro Santos enviou uma solicitação de amizade</li>
          </ul>
          <p>Acesse o Facebook para ver mais.</p>
        `,
        time: 'há 1h',
        timestamp: Date.now() - 1 * 60 * 60 * 1000,
        isRead: false,
        isStarred: false,
        folder: 'inbox',
        isImportant: false
      },
      {
        id: 6,
        sender: 'Amazon',
        senderEmail: 'vendas@amazon.com.br',
        subject: 'Black Friday: Até 70% OFF em Eletrônicos! 🔥',
        preview: 'Não perca! Ofertas imperdíveis com descontos de até 70% em smartphones, notebooks...',
        content: `
          <h2>🔥 BLACK FRIDAY AMAZON 🔥</h2>
          <p>Não perca as melhores ofertas do ano!</p>
          <ul>
            <li>📱 Smartphones até 60% OFF</li>
            <li>💻 Notebooks até 70% OFF</li>
            <li>🎧 Fones de ouvido até 50% OFF</li>
          </ul>
          <p>Cupom: BLACKFRIDAY2024</p>
          <p>Válido até domingo!</p>
        `,
        time: 'há 3h',
        timestamp: Date.now() - 3 * 60 * 60 * 1000,
        isRead: true,
        isStarred: false,
        folder: 'inbox',
        isImportant: false
      },
      {
        id: 7,
        sender: 'Microsoft Teams',
        senderEmail: 'updates@teams.microsoft.com',
        subject: 'Atualização do Microsoft Teams - Novos recursos',
        preview: 'Confira as novidades da versão 2.1: Nova interface, melhor qualidade de vídeo...',
        content: `
          <h3>Novidades do Microsoft Teams v2.1</h3>
          <p>Confira os novos recursos:</p>
          <ul>
            <li>🎨 Nova interface mais moderna</li>
            <li>📹 Melhor qualidade de vídeo em 4K</li>
            <li>🔄 Sincronização mais rápida</li>
            <li>🛡️ Novas opções de segurança</li>
          </ul>
          <p>A atualização será instalada automaticamente.</p>
        `,
        time: 'ontem',
        timestamp: Date.now() - 24 * 60 * 60 * 1000,
        isRead: false,
        isStarred: false,
        folder: 'inbox',
        isImportant: false
      },
      {
        id: 8,
        sender: 'LinkedIn',
        senderEmail: 'notifications@linkedin.com',
        subject: 'Seu perfil teve 25 visualizações esta semana',
        preview: 'Profissionais estão interessados no seu perfil. Veja quem visualizou...',
        content: `
          <p>Ótimas notícias!</p>
          <p>Seu perfil no LinkedIn teve 25 visualizações esta semana.</p>
          <p>Profissionais das seguintes empresas visualizaram seu perfil:</p>
          <ul>
            <li>Google Brasil</li>
            <li>Microsoft</li>
            <li>Banco do Brasil</li>
            <li>Petrobras</li>
          </ul>
          <p>Continue engajando para aumentar sua visibilidade!</p>
        `,
        time: 'há 2 dias',
        timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
        isRead: true,
        isStarred: true,
        folder: 'inbox',
        isImportant: false
      }
    ],

  async init() {
    this.checkConnection();
    if (this.isConnected) {
      await this.loadGmailEmails();
    } else {
      this.showDisconnectedState();
      // Inicializar com emails de exemplo se não estiver conectado
      this.emails = [...this.demoEmails];
      this.allEmails = [...this.demoEmails];
      this.updateImportantEmails();
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

  // Funções de paginação
  nextPage() {
    const maxPage = Math.ceil(this.allEmails.length / this.emailsPerPage);
    if (this.currentPage < maxPage) {
      this.currentPage++;
      this.updateEmailDisplay();
    }
  },

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updateEmailDisplay();
    }
  },

  goToPage(page) {
    const maxPage = Math.ceil(this.allEmails.length / this.emailsPerPage);
    if (page >= 1 && page <= maxPage) {
      this.currentPage = page;
      this.updateEmailDisplay();
    }
  },

  updateEmailDisplay() {
    const startIndex = (this.currentPage - 1) * this.emailsPerPage;
    const endIndex = startIndex + this.emailsPerPage;
    this.emails = this.allEmails.slice(startIndex, endIndex);
    this.renderEmails();
    this.renderPagination();
  },

  renderPagination() {
    const paginationContainer = document.getElementById('email-pagination');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(this.allEmails.length / this.emailsPerPage);
    
    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let paginationHTML = `
      <div class="pagination-controls">
        <button class="pagination-btn" onclick="window.emailSystem.prevPage()" ${this.currentPage === 1 ? 'disabled' : ''}>
          <span class="material-symbols-outlined">chevron_left</span>
          Anterior
        </button>
        
        <div class="page-numbers">
    `;

    // Mostrar até 5 páginas com elipses se necessário
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(totalPages, this.currentPage + 2);

    if (startPage > 1) {
      paginationHTML += `<span class="page-ellipsis">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                onclick="window.emailSystem.goToPage(${i})">
          ${i}
        </button>
      `;
    }

    if (endPage < totalPages) {
      paginationHTML += `<span class="page-ellipsis">...</span>`;
    }

    paginationHTML += `
        </div>
        
        <button class="pagination-btn" onclick="window.emailSystem.nextPage()" ${this.currentPage === totalPages ? 'disabled' : ''}>
          Próxima
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
      
      <div class="pagination-info">
        Página ${this.currentPage} de ${totalPages} • ${this.emails.length} emails
      </div>
    `;

    paginationContainer.innerHTML = paginationHTML;
  },

  // Funções para emails importantes
  toggleImportant(emailId) {
    const email = this.allEmails.find(e => e.id === emailId);
    if (email) {
      email.isImportant = !email.isImportant;
      this.updateImportantEmails();
      this.updateEmailDisplay();
      this.renderEmails();
    }
  },

  updateImportantEmails() {
    this.importantEmails = this.allEmails.filter(email => email.isImportant);
  },

  showImportantEmails() {
    this.currentFolder = 'important';
    this.emails = this.importantEmails;
    this.currentPage = 1;
    this.renderEmails();
    this.renderPagination();
    this.updateStats();
  },

  // Sistema de abas
  currentTab: 'all',
  
  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Atualizar interface das abas
    document.querySelectorAll('.email-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Filtrar emails por categoria
    this.filterEmailsByTab(tabName);
  },

  filterEmailsByTab(tabName) {
    let filteredEmails = [...this.allEmails];
    
    switch (tabName) {
      case 'primary':
        filteredEmails = this.allEmails.filter(email => this.isPrimaryEmail(email));
        break;
      case 'social':
        filteredEmails = this.allEmails.filter(email => this.isSocialEmail(email));
        break;
      case 'promotions':
        filteredEmails = this.allEmails.filter(email => this.isPromotionEmail(email));
        break;
      case 'updates':
        filteredEmails = this.allEmails.filter(email => this.isUpdateEmail(email));
        break;
      case 'all':
      default:
        filteredEmails = this.allEmails;
        break;
    }
    
    this.emails = filteredEmails;
    this.currentPage = 1;
    this.updateEmailDisplay();
  },

  // Classificação de emails por categoria
  isPrimaryEmail(email) {
    const primaryKeywords = ['reunião', 'projeto', 'importante', 'urgente', 'relatório'];
    const content = (email.subject + ' ' + email.content + ' ' + email.sender).toLowerCase();
    return primaryKeywords.some(keyword => content.includes(keyword)) || email.isImportant;
  },

  isSocialEmail(email) {
    const socialKeywords = ['facebook', 'twitter', 'instagram', 'linkedin', 'social', 'rede'];
    const socialDomains = ['facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com'];
    const content = (email.subject + ' ' + email.content + ' ' + email.senderEmail).toLowerCase();
    return socialKeywords.some(keyword => content.includes(keyword)) ||
           socialDomains.some(domain => email.senderEmail.includes(domain));
  },

  isPromotionEmail(email) {
    const promoKeywords = ['promoção', 'desconto', 'oferta', 'black friday', 'cupom', 'venda', 'sale'];
    const content = (email.subject + ' ' + email.content).toLowerCase();
    return promoKeywords.some(keyword => content.includes(keyword));
  },

  isUpdateEmail(email) {
    const updateKeywords = ['atualização', 'update', 'novidades', 'changelog', 'versão', 'termos'];
    const content = (email.subject + ' ' + email.content).toLowerCase();
    return updateKeywords.some(keyword => content.includes(keyword));
  },

  // Sistema de pesquisa avançada
  searchHistory: [],
  currentFilters: {},

  toggleSearchFilters() {
    const filtersDiv = document.getElementById('search-filters');
    const filtersBtn = document.getElementById('search-filters-btn');
    
    if (filtersDiv.style.display === 'none') {
      filtersDiv.style.display = 'block';
      filtersBtn.classList.add('active');
    } else {
      filtersDiv.style.display = 'none';
      filtersBtn.classList.remove('active');
    }
  },

  applyAdvancedSearch() {
    const filters = {
      query: document.getElementById('email-search-input').value.toLowerCase(),
      sender: document.getElementById('filter-sender').value.toLowerCase(),
      subject: document.getElementById('filter-subject').value.toLowerCase(),
      date: document.getElementById('filter-date').value,
      status: document.getElementById('filter-status').value
    };

    this.currentFilters = filters;
    
    // Salvar no histórico se houver algum filtro
    if (Object.values(filters).some(value => value)) {
      this.addToSearchHistory(filters);
    }

    let filteredEmails = [...this.allEmails];

    // Aplicar filtro de texto geral
    if (filters.query) {
      filteredEmails = filteredEmails.filter(email => {
        const searchText = (email.subject + ' ' + email.content + ' ' + email.sender).toLowerCase();
        return searchText.includes(filters.query);
      });
    }

    // Aplicar filtro de remetente
    if (filters.sender) {
      filteredEmails = filteredEmails.filter(email => 
        email.sender.toLowerCase().includes(filters.sender) ||
        email.senderEmail.toLowerCase().includes(filters.sender)
      );
    }

    // Aplicar filtro de assunto
    if (filters.subject) {
      filteredEmails = filteredEmails.filter(email => 
        email.subject.toLowerCase().includes(filters.subject)
      );
    }

    // Aplicar filtro de data
    if (filters.date) {
      filteredEmails = this.filterByDate(filteredEmails, filters.date);
    }

    // Aplicar filtro de status
    if (filters.status) {
      filteredEmails = this.filterByStatus(filteredEmails, filters.status);
    }

    this.emails = filteredEmails;
    this.currentPage = 1;
    this.updateEmailDisplay();
    
    // Fechar painel de filtros
    this.toggleSearchFilters();
    
    showSuccess('Pesquisa', `${filteredEmails.length} emails encontrados`);
  },

  filterByDate(emails, dateFilter) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return emails.filter(email => {
      const emailDate = new Date(email.timestamp);
      
      switch (dateFilter) {
        case 'today':
          return emailDate >= today;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return emailDate >= yesterday && emailDate < today;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return emailDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return emailDate >= monthAgo;
        case 'year':
          const yearAgo = new Date(today);
          yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          return emailDate >= yearAgo;
        default:
          return true;
      }
    });
  },

  filterByStatus(emails, statusFilter) {
    switch (statusFilter) {
      case 'unread':
        return emails.filter(email => !email.isRead);
      case 'read':
        return emails.filter(email => email.isRead);
      case 'starred':
        return emails.filter(email => email.isStarred);
      case 'important':
        return emails.filter(email => email.isImportant);
      default:
        return emails;
    }
  },

  clearSearchFilters() {
    document.getElementById('email-search-input').value = '';
    document.getElementById('filter-sender').value = '';
    document.getElementById('filter-subject').value = '';
    document.getElementById('filter-date').value = '';
    document.getElementById('filter-status').value = '';
    
    this.currentFilters = {};
    this.emails = [...this.allEmails];
    this.currentPage = 1;
    this.updateEmailDisplay();
    this.toggleSearchFilters();
    
    showInfo('Filtros', 'Todos os filtros foram limpos');
  },

  addToSearchHistory(filters) {
    const searchTerm = filters.query || 
                      (filters.sender ? `De: ${filters.sender}` : '') ||
                      (filters.subject ? `Assunto: ${filters.subject}` : '') ||
                      'Pesquisa avançada';
    
    // Remover se já existe
    this.searchHistory = this.searchHistory.filter(item => item.term !== searchTerm);
    
    // Adicionar no início
    this.searchHistory.unshift({
      term: searchTerm,
      filters: { ...filters },
      timestamp: Date.now()
    });
    
    // Manter apenas os últimos 10
    this.searchHistory = this.searchHistory.slice(0, 10);
    
    // Salvar no localStorage
    localStorage.setItem('email_search_history', JSON.stringify(this.searchHistory));
  },

  loadSearchHistory() {
    const saved = localStorage.getItem('email_search_history');
    if (saved) {
      this.searchHistory = JSON.parse(saved);
    }
  },

  showSearchSuggestions() {
    const input = document.getElementById('email-search-input');
    const suggestionsDiv = document.getElementById('search-suggestions');
    const query = input.value.toLowerCase();
    
    if (query.length < 2) {
      suggestionsDiv.style.display = 'none';
      return;
    }
    
    // Sugestões baseadas no histórico
    const historySuggestions = this.searchHistory
      .filter(item => item.term.toLowerCase().includes(query))
      .slice(0, 3);
    
    // Sugestões baseadas em remetentes
    const senderSuggestions = [...new Set(this.allEmails.map(email => email.sender))]
      .filter(sender => sender.toLowerCase().includes(query))
      .slice(0, 3);
    
    // Sugestões baseadas em assuntos
    const subjectSuggestions = this.allEmails
      .map(email => email.subject)
      .filter(subject => subject.toLowerCase().includes(query))
      .slice(0, 3);
    
    let suggestionsHTML = '';
    
    if (historySuggestions.length > 0) {
      suggestionsHTML += historySuggestions.map(item => `
        <div class="suggestion-item" onclick="emailSystem.applySuggestion('${item.term}')">
          <span class="suggestion-icon material-symbols-outlined">history</span>
          <span class="suggestion-text">${item.term}</span>
          <span class="suggestion-type">Histórico</span>
        </div>
      `).join('');
    }
    
    if (senderSuggestions.length > 0) {
      suggestionsHTML += senderSuggestions.map(sender => `
        <div class="suggestion-item" onclick="emailSystem.applySuggestion('${sender}', 'sender')">
          <span class="suggestion-icon material-symbols-outlined">person</span>
          <span class="suggestion-text">${sender}</span>
          <span class="suggestion-type">Remetente</span>
        </div>
      `).join('');
    }
    
    if (subjectSuggestions.length > 0) {
      suggestionsHTML += subjectSuggestions.map(subject => `
        <div class="suggestion-item" onclick="emailSystem.applySuggestion('${subject}', 'subject')">
          <span class="suggestion-icon material-symbols-outlined">subject</span>
          <span class="suggestion-text">${subject}</span>
          <span class="suggestion-type">Assunto</span>
        </div>
      `).join('');
    }
    
    if (suggestionsHTML) {
      suggestionsDiv.innerHTML = suggestionsHTML;
      suggestionsDiv.style.display = 'block';
    } else {
      suggestionsDiv.style.display = 'none';
    }
  },

  applySuggestion(text, type = 'general') {
    const input = document.getElementById('email-search-input');
    const suggestionsDiv = document.getElementById('search-suggestions');
    
    if (type === 'sender') {
      document.getElementById('filter-sender').value = text;
      this.toggleSearchFilters();
    } else if (type === 'subject') {
      document.getElementById('filter-subject').value = text;
      this.toggleSearchFilters();
    } else {
      input.value = text;
    }
    
    suggestionsDiv.style.display = 'none';
    this.applyAdvancedSearch();
  },

  bindEvents() {
    // Carregar histórico de pesquisa
    this.loadSearchHistory();
    
    // Conectar/Desconectar Gmail
    document.getElementById('connect-gmail-btn').addEventListener('click', () => this.connectGmail());
    document.getElementById('disconnect-gmail-btn').addEventListener('click', () => this.disconnectGmail());
    
    // Ações de email
    document.getElementById('compose-email-btn').addEventListener('click', () => this.composeEmail());
    document.getElementById('refresh-emails-btn').addEventListener('click', (e) => this.refreshEmails(e));
    
    // Teste de APIs
    document.getElementById('test-apis-btn').addEventListener('click', () => this.testAPIs());
    
    // Abas de email
    document.querySelectorAll('.email-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        this.switchTab(tabName);
      });
    });
    
    // Pesquisa avançada
    document.getElementById('email-search-input').addEventListener('input', (e) => {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        if (e.target.value.length >= 2) {
          this.showSearchSuggestions();
        } else {
          document.getElementById('search-suggestions').style.display = 'none';
        }
      }, 300);
    });
    
    // Botão de filtros
    document.getElementById('search-filters-btn').addEventListener('click', () => this.toggleSearchFilters());
    
    // Aplicar filtros
    document.getElementById('apply-filters').addEventListener('click', () => this.applyAdvancedSearch());
    document.getElementById('clear-filters').addEventListener('click', () => this.clearSearchFilters());
    
    // Fechar sugestões ao clicar fora
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.email-search')) {
        document.getElementById('search-suggestions').style.display = 'none';
        if (document.getElementById('search-filters').style.display === 'block') {
          document.getElementById('search-filters').style.display = 'none';
          document.getElementById('search-filters-btn').classList.remove('active');
        }
      }
    });
    
    // Pastas de email
    document.querySelectorAll('.email-folder').forEach(folder => {
      folder.addEventListener('click', (e) => {
        const folderType = e.currentTarget.dataset.folder;
        if (folderType === 'important') {
          this.showImportantEmails();
        } else {
          this.switchFolder(folderType);
        }
      });
    });
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
        const currentOrigin = window.location.origin;
        errorMessage = `URL não autorizada (${currentOrigin}). Adicione esta URL no Google Cloud Console. Clique "Testar APIs" para ver as URLs exatas.`;
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
      // Usar a nova Google Identity API com configurações para localhost
      if (typeof google === 'undefined' || !google.accounts) {
        reject(new Error('Google Identity API não carregada'));
        return;
      }

      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: gmailConfig.clientId,
          scope: gmailConfig.scopes,
          prompt: 'select_account',
          include_granted_scopes: true,
          state: Math.random().toString(36).substring(2, 15),
          ux_mode: 'popup',
          callback: (response) => {
            console.log('📥 Resposta do OAuth recebida:', response);
            
            if (response.error) {
              console.error('❌ Erro OAuth:', response.error);
              reject(new Error(`Erro OAuth: ${response.error}`));
              return;
            }
            
            if (!response.access_token) {
              console.error('❌ Token não recebido na resposta');
              reject(new Error('Token de acesso não foi recebido'));
              return;
            }
            
            console.log('✅ Token de acesso recebido');
            this.accessToken = response.access_token;
            
            // Buscar info do usuário
            this.getUserInfo().then(() => {
              // Salvar no localStorage
              localStorage.setItem('gmail_access_token', this.accessToken);
              localStorage.setItem('gmail_user_email', this.userEmail);
              console.log('✅ Dados salvos no localStorage');
              resolve();
            }).catch((error) => {
              console.error('❌ Erro ao buscar info do usuário:', error);
              // Mesmo com erro de user info, podemos prosseguir
              this.userEmail = 'usuario@gmail.com';
              localStorage.setItem('gmail_access_token', this.accessToken);
              localStorage.setItem('gmail_user_email', this.userEmail);
              resolve();
            });
          },
          error_callback: (error) => {
            console.error('❌ Erro no callback de erro:', error);
            reject(new Error(`Erro na autenticação: ${error.type || error.message || 'Erro desconhecido'}`));
          }
        });

        console.log('🚀 Iniciando solicitação de token...');
        client.requestAccessToken();
        
      } catch (error) {
        console.error('❌ Erro ao criar cliente OAuth:', error);
        reject(new Error(`Erro ao inicializar cliente: ${error.message}`));
      }
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
        
        // Filtrar emails válidos e corrigir encoding
        this.emails = emailDetails.filter(email => email !== null).map(email => this.fixEmailEncoding(email));
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

  fixEmailEncoding(email) {
    if (!email) return email;
    
    try {
      // Corrige o subject se necessário
      if (email.subject) {
        email.subject = this.decodeUTF8(email.subject);
      }
      
      // Corrige o sender se necessário
      if (email.sender) {
        email.sender = this.decodeUTF8(email.sender);
      }
      
      // Corrige o content se necessário
      if (email.content) {
        email.content = this.decodeUTF8(email.content);
      }
      
      // Recria o preview com o conteúdo corrigido
      if (email.content) {
        email.preview = this.createPreview(email.content);
      }
      
      return email;
    } catch (error) {
      console.warn('Erro ao corrigir encoding do email:', error);
      return email;
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
    try {
      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/html' && part.body.data) {
            const base64Data = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
            const decodedData = atob(base64Data);
            return this.decodeUTF8(decodedData);
          }
          if (part.mimeType === 'text/plain' && part.body.data) {
            const base64Data = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
            const decodedData = atob(base64Data);
            const plainText = this.decodeUTF8(decodedData);
            return plainText.replace(/\n/g, '<br>');
          }
        }
      } else if (payload.body.data) {
        const base64Data = payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
        const decodedData = atob(base64Data);
        if (payload.mimeType === 'text/html') {
          return this.decodeUTF8(decodedData);
        } else {
          const plainText = this.decodeUTF8(decodedData);
          return plainText.replace(/\n/g, '<br>');
        }
      }
    } catch (error) {
      console.error('Erro ao decodificar conteúdo do email:', error);
    }
    return 'Conteúdo não disponível';
  },

  decodeUTF8(str) {
    try {
      // Tenta decodificar como UTF-8
      return decodeURIComponent(escape(str));
    } catch (error) {
      try {
        // Fallback: tenta TextDecoder se disponível
        if (typeof TextDecoder !== 'undefined') {
          const decoder = new TextDecoder('utf-8');
          const encoder = new TextEncoder();
          const bytes = encoder.encode(str);
          return decoder.decode(bytes);
        }
      } catch (e) {
        console.warn('Erro na decodificação UTF-8:', e);
      }
      // Se tudo falhar, retorna a string original
      return str;
    }
  },

  createPreview(content) {
    try {
      // Remove HTML tags e normaliza espaços
      let textContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      
      // Remove caracteres de controle e normaliza
      textContent = textContent.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      
      // Corrige encoding se necessário
      try {
        textContent = decodeURIComponent(escape(textContent));
      } catch (e) {
        // Se falhar, mantém o texto original
      }
      
      return textContent.length > 120 ? textContent.substring(0, 120) + '...' : textContent;
    } catch (error) {
      console.warn('Erro ao criar preview:', error);
      return 'Preview não disponível';
    }
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
        return this.emails.filter(e => e.folder === 'inbox' || !e.folder);
      case 'sent':
        return this.emails.filter(e => e.folder === 'sent');
      case 'starred':
        return this.emails.filter(e => e.isStarred);
      case 'drafts':
        return this.emails.filter(e => e.folder === 'drafts');
      case 'trash':
        return this.emails.filter(e => e.folder === 'trash');
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
      <div class="email-item ${!email.isRead ? 'unread' : ''}" onclick="emailSystem.openEmail('${email.id}')">
        <div class="email-avatar">${email.sender.charAt(0)}</div>
        <div class="email-info">
          <div class="email-sender">${email.sender}</div>
          <div class="email-subject">${email.subject}</div>
          <div class="email-preview">${email.preview}</div>
        </div>
        <div class="email-meta">
          <div class="email-time">${email.time}</div>
          <div class="email-actions-mini">
            <button class="email-action-mini" onclick="event.stopPropagation(); emailSystem.toggleStar('${email.id}')" title="${email.isStarred ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
              <span class="material-symbols-outlined">${email.isStarred ? 'star' : 'star_border'}</span>
            </button>
            <button class="email-action-mini" onclick="event.stopPropagation(); emailSystem.deleteEmail('${email.id}')" title="Excluir">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  openEmail(emailId) {
    console.log('Tentando abrir email com ID:', emailId);
    console.log('Emails disponíveis:', this.emails.map(e => ({id: e.id, subject: e.subject})));
    
    const email = this.emails.find(e => e.id == emailId); // Usar == para comparação flexível
    if (!email) {
      console.error('Email não encontrado:', emailId);
      showError('Erro', 'Email não encontrado');
      return;
    }

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
          <div class="email-modal-title">📧 ${email.subject}</div>
          <button class="email-modal-close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="email-modal-body">
          <div style="margin-bottom: 24px; padding: 20px; background: linear-gradient(135deg, var(--bg-secondary) 0%, rgba(124, 58, 237, 0.03) 100%); border-radius: 12px; border-left: 4px solid var(--accent-primary);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
              <div class="email-avatar" style="width: 32px; height: 32px; font-size: 14px;">${email.sender.charAt(0)}</div>
              <div>
                <div style="font-weight: 600; color: var(--text-primary);">${email.sender}</div>
                <div style="color: var(--text-secondary); font-size: 14px;">${email.senderEmail || 'email@exemplo.com'}</div>
              </div>
            </div>
            <div style="color: var(--text-secondary); font-size: 14px;">
              <strong>Data:</strong> ${email.time}
            </div>
          </div>
          <div style="line-height: 1.7; color: var(--text-primary); font-size: 16px; margin-bottom: 24px;">
            ${email.content || email.preview || 'Conteúdo do email não disponível.'}
          </div>
          
          <!-- Botões de ação -->
          <div class="email-action-buttons">
            <button type="button" id="reply-email-btn" class="email-action-btn reply">
              <span class="material-symbols-outlined">reply</span>
              Responder
            </button>
            <button type="button" id="forward-email-btn" class="email-action-btn forward">
              <span class="material-symbols-outlined">forward</span>
              Encaminhar
            </button>
            <button type="button" id="delete-email-btn" class="email-action-btn delete">
              <span class="material-symbols-outlined">delete</span>
              Excluir
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Forçar exibição
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    
    setTimeout(() => {
      modal.classList.add('show');
      console.log('Modal exibido');
    }, 10);

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

    // Eventos dos botões (preservar contexto)
    const self = this;
    modal.querySelector('#reply-email-btn').addEventListener('click', () => {
      console.log('=== BOTÃO RESPONDER CLICADO ===');
      closeModal();
      self.replyToEmail(email);
    });

    modal.querySelector('#forward-email-btn').addEventListener('click', () => {
      console.log('=== BOTÃO ENCAMINHAR CLICADO ===');
      closeModal();
      self.forwardEmail(email);
    });

    modal.querySelector('#delete-email-btn').addEventListener('click', () => {
      console.log('=== BOTÃO EXCLUIR CLICADO ===');
      closeModal();
      self.deleteEmail(email.id);
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
      <div class="email-item ${!email.isRead ? 'unread' : ''}" onclick="emailSystem.openEmail('${email.id}')">
        <div class="email-avatar">${email.sender.charAt(0)}</div>
        <div class="email-info">
          <div class="email-sender">${email.sender}</div>
          <div class="email-subject">${email.subject}</div>
          <div class="email-preview">${email.preview}</div>
        </div>
        <div class="email-meta">
          <div class="email-time">${email.time}</div>
          <div class="email-actions-mini">
            <button class="email-action-mini" onclick="event.stopPropagation(); emailSystem.toggleStar('${email.id}')">
              <span class="material-symbols-outlined">${email.isStarred ? 'star' : 'star_border'}</span>
            </button>
            <button class="email-action-mini" onclick="event.stopPropagation(); emailSystem.deleteEmail('${email.id}')">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  composeEmail() {
    this.openComposeModal();
  },

  openComposeModal(options = {}) {
    const { to = '', subject = '', message = '', isReply = false, isForward = false } = options;
    
    const modalTitle = isReply ? '↩️ Responder Email' : isForward ? '↪️ Encaminhar Email' : '✉️ Novo Email';
    
    const modal = document.createElement('div');
    modal.className = 'email-modal';
    modal.innerHTML = `
      <div class="email-modal-content">
        <div class="email-modal-header">
          <div class="email-modal-title">${modalTitle}</div>
          <button class="email-modal-close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="email-modal-body">
          <form id="compose-form" style="display: flex; flex-direction: column; gap: 16px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label style="font-weight: 500; color: var(--text-primary);">Para:</label>
              <input type="email" id="compose-to" placeholder="destinatario@email.com" value="${to}" style="padding: 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px;" required>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label style="font-weight: 500; color: var(--text-primary);">Assunto:</label>
              <input type="text" id="compose-subject" placeholder="Assunto do email" value="${subject}" style="padding: 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px;" required>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label style="font-weight: 500; color: var(--text-primary);">Mensagem:</label>
              <textarea id="compose-message" placeholder="Digite sua mensagem aqui..." style="padding: 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px; min-height: 200px; resize: vertical; font-family: inherit;" required>${message}</textarea>
            </div>
            
            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px;">
              <button type="button" id="compose-cancel" style="padding: 12px 24px; border: 2px solid var(--border-color); background: transparent; color: var(--text-secondary); border-radius: 8px; cursor: pointer;">Cancelar</button>
              <button type="submit" id="compose-send" style="padding: 12px 24px; border: none; background: var(--accent-primary); color: white; border-radius: 8px; cursor: pointer; font-weight: 500;">Enviar</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);

    // Eventos
    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 200);
    };

    modal.querySelector('.email-modal-close').addEventListener('click', closeModal);
    modal.querySelector('#compose-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Enviar email (preservar contexto)
    const self = this;
    document.getElementById('compose-form').addEventListener('submit', (e) => {
      console.log('=== FORMULÁRIO DE ENVIO SUBMETIDO ===');
      e.preventDefault();
      
      const emailData = {
        to: document.getElementById('compose-to').value,
        subject: document.getElementById('compose-subject').value,
        message: document.getElementById('compose-message').value
      };
      
      console.log('Dados coletados do formulário:', emailData);
      self.sendEmail(emailData);
      closeModal();
    });
  },

  sendEmail(emailData) {
    console.log('=== SEND EMAIL INICIADO ===');
    console.log('Dados do email a enviar:', emailData);
    
    // Validar dados
    if (!emailData.to || !emailData.subject || !emailData.message) {
      console.error('Dados incompletos para envio:', emailData);
      showError('Erro', 'Todos os campos são obrigatórios!');
      return;
    }
    
    // Simular envio (em produção, usaria Gmail API)
    const sendBtn = document.getElementById('compose-send');
    console.log('Botão de envio encontrado:', !!sendBtn);
    
    if (sendBtn) {
      setButtonLoading(sendBtn, true);
      console.log('Loading aplicado ao botão');
    }
    
    // Simular delay de envio
    setTimeout(() => {
      console.log('Simulação de envio completada');
      
      if (sendBtn) {
        setButtonLoading(sendBtn, false);
        console.log('Loading removido do botão');
      }
      
      // Mostrar sucesso
      showSuccess('Email Enviado', `Email enviado para ${emailData.to} com sucesso!`);
      
      // Adicionar aos emails enviados (simulação)
      const sentEmail = {
        id: Date.now().toString(),
        sender: this.userEmail || 'Você',
        senderEmail: this.userEmail || 'voce@email.com',
        subject: emailData.subject,
        preview: emailData.message.substring(0, 100) + '...',
        content: emailData.message,
        time: new Date().toLocaleString('pt-BR'),
        isRead: true,
        isUnread: false,
        isStarred: false,
        folder: 'sent'
      };
      
      // Adicionar à lista de emails
      this.emails.unshift(sentEmail);
      this.updateStats();
      
      // Atualizar a visualização se estiver na pasta "Enviados"
      if (this.currentFolder === 'sent') {
        this.renderEmails();
      }
      
      console.log('Email simulado enviado com sucesso:', sentEmail);
      
    }, 2000);
  },

  replyToEmail(email) {
    console.log('=== REPLY TO EMAIL INICIADO ===');
    console.log('Email para responder:', email);
    
    try {
      this.openComposeModal({
        to: email.senderEmail || email.sender,
        subject: `Re: ${email.subject}`,
        message: `\n\n--- Email Original ---\nDe: ${email.sender}\nData: ${email.time}\nAssunto: ${email.subject}\n\n${email.content || email.preview}\n\n--- Sua Resposta ---\n`,
        isReply: true
      });
      console.log('Modal de resposta aberto com sucesso');
    } catch (error) {
      console.error('Erro ao abrir modal de resposta:', error);
      showError('Erro', 'Não foi possível abrir o modal de resposta');
    }
  },

  forwardEmail(email) {
    console.log('=== FORWARD EMAIL INICIADO ===');
    console.log('Email para encaminhar:', email);
    
    try {
      this.openComposeModal({
        to: '',
        subject: `Fwd: ${email.subject}`,
        message: `\n\n--- Email Encaminhado ---\nDe: ${email.sender}\nData: ${email.time}\nAssunto: ${email.subject}\n\n${email.content || email.preview}\n\n--- Mensagem de Encaminhamento ---\n`,
        isForward: true
      });
      console.log('Modal de encaminhamento aberto com sucesso');
    } catch (error) {
      console.error('Erro ao abrir modal de encaminhamento:', error);
      showError('Erro', 'Não foi possível abrir o modal de encaminhamento');
    }
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
    const unreadCount = this.allEmails.filter(e => !e.isRead && e.folder === 'inbox').length;
    const starredCount = this.allEmails.filter(e => e.isStarred).length;
    const importantCount = this.allEmails.filter(e => e.isImportant).length;
    
    document.getElementById('inbox-count').textContent = unreadCount;
    document.getElementById('starred-count').textContent = starredCount;
    
    // Atualizar contadores nas pastas
    const inboxFolder = document.querySelector('[data-folder="inbox"] .folder-count');
    const starredFolder = document.querySelector('[data-folder="starred"] .folder-count');
    const importantFolder = document.getElementById('important-count');
    
    if (inboxFolder) inboxFolder.textContent = unreadCount;
    if (starredFolder) starredFolder.textContent = starredCount;
    if (importantFolder) importantFolder.textContent = importantCount;
  },

  testAPIs() {
    console.clear();
    console.log('=== TESTE DAS APIS DO GOOGLE + CONFIGURAÇÃO ===');
    
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
    
    // Teste 4: URLs para Google Cloud Console
    const currentOrigin = window.location.origin;
    console.log('4. 🚨 CONFIGURAÇÃO NECESSÁRIA NO GOOGLE CLOUD:');
    console.log('   ⚠️ Se está dando erro redirect_uri_mismatch, adicione:');
    console.log('   📋 JavaScript Origins (adicione ESTA URL):');
    console.log('      - ' + currentOrigin);
    console.log('   📋 Redirect URIs (adicione ESTAS URLs):');
    console.log('      - ' + currentOrigin);
    console.log('      - ' + currentOrigin + '/');
    console.log('   ');
    console.log('   💡 URLs de desenvolvimento (se ainda não adicionou):');
    console.log('      - http://localhost:3000');
    console.log('      - http://127.0.0.1:3000');
    
    // Teste 5: Tentar carregar gapi (apenas client)
    if (typeof gapi !== 'undefined') {
      console.log('5. Testando gapi.load...');
      try {
        gapi.load('client', () => {
          console.log('   ✅ gapi.load funcionou');
          
          // Teste 6: Tentar inicializar
          gapi.client.init({
            apiKey: gmailConfig.apiKey,
            discoveryDocs: [gmailConfig.discoveryDoc]
          }).then(() => {
            console.log('   ✅ gapi.client.init funcionou');
            
            // Teste 7: Google Identity API
            if (typeof google !== 'undefined' && google.accounts) {
              console.log('   ✅ Google Identity API disponível');
              showSuccess('APIs OK', 'APIs funcionando! Configure as URLs no Google Cloud Console.');
            } else {
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
      console.log('5. ❌ gapi não está disponível');
      showError('APIs', 'Google API não foi carregada. Verifique sua conexão.');
    }
    
    showInfo('Teste de APIs', 'Verifique o console para URLs exatas do Google Cloud!');
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
