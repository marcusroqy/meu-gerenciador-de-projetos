document.addEventListener('DOMContentLoaded', () => {

    // ==================================================================
    // --- CONFIGURAÇÃO DO SUPABASE ---
    // ==================================================================
    // !! IMPORTANTE !! Cole suas chaves do Supabase aqui
    const SUPABASE_URL = 'https://hmcuzsbfuvwbdemjbcpsa.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI-5QiUqPwa0w'; // A CHAVE ANON QUE VOCÊ JÁ TEM

    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ==================================================================
    // --- SELEÇÃO DOS ELEMENTOS GLOBAIS ---
    // ==================================================================
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const signOutBtn = document.getElementById('sign-out-btn');
    const notificationContainer = document.getElementById('notification-container');
    
    // Elementos da aplicação
    const mainNav = document.querySelector('.main-nav ul');
    const mainViews = document.querySelectorAll('.main-view');
    const projectToggleBtn = document.getElementById('project-toggle-btn');
    const projectsNavItem = document.getElementById('projects-nav-item');
    const projectSubmenu = document.querySelector('.project-submenu');
    const projectForm = document.getElementById('project-form');
    const projectInput = document.getElementById('project-input');
    const projectList = document.getElementById('project-list');
    const currentProjectTitle = document.getElementById('current-project-title');
    const taskCounter = document.getElementById('task-counter');
    const taskForm = document.getElementById('task-form');
    const kanbanBoard = document.getElementById('kanban-board');
    const userAvatar = document.querySelector('.user-avatar');
    const userNameSpan = document.querySelector('.sidebar-header span');

    // Elementos do Modal
    const modalOverlay = document.getElementById('task-details-modal');
    const modalCloseBtn = modalOverlay.querySelector('.modal-close-btn');
    const modalTaskTitle = document.getElementById('modal-task-title');
    const modalTaskDetails = document.getElementById('modal-task-details');
    const commentForm = document.getElementById('comment-form');
    const commentInput = document.getElementById('comment-input');
    const commentList = document.getElementById('comment-list');
    
    // --- ESTRUTURA DE DADOS E ESTADO ---
    let user = null;
    let projects = [];
    let tasks = [];
    let activeProjectId = null;
    let activeTask = null;
    let globalStatusChart = null;

    // ==================================================================
    // --- LÓGICA DE AUTENTICAÇÃO ---
    // ==================================================================
    _supabase.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
            user = session.user;
            authView.classList.add('view-hidden');
            appView.classList.remove('view-hidden');
            // Vamos carregar o perfil do usuário do banco de dados (se existir)
            userNameSpan.textContent = user.email; // Fallback
            userAvatar.textContent = user.email.charAt(0).toUpperCase();
            await loadInitialData();
        } else {
            user = null;
            authView.classList.remove('view-hidden');
            appView.classList.add('view-hidden');
        }
    });

    registerForm.addEventListener('submit', async (e) => { e.preventDefault(); const email = document.getElementById('register-email').value; const password = document.getElementById('register-password').value; const { data, error } = await _supabase.auth.signUp({ email, password }); if (error) { showNotification(`Erro: ${error.message}`, 'error'); } else { showNotification('Conta criada! Verifique seu email para confirmação (se estiver ativo).', 'success'); document.getElementById('register-form-container').classList.add('view-hidden'); document.getElementById('login-form-container').classList.remove('view-hidden'); } });
    loginForm.addEventListener('submit', async (e) => { e.preventDefault(); const email = document.getElementById('login-email').value; const password = document.getElementById('login-password').value; const { data, error } = await _supabase.auth.signInWithPassword({ email, password }); if (error) { showNotification(`Erro: ${error.message}`, 'error'); } });
    signOutBtn.addEventListener('click', async () => { await _supabase.auth.signOut(); });
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-form-container').classList.add('view-hidden'); document.getElementById('register-form-container').classList.remove('view-hidden'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('register-form-container').classList.add('view-hidden'); document.getElementById('login-form-container').classList.remove('view-hidden'); });

    // ==================================================================
    // --- LÓGICA DE NAVEGAÇÃO ---
    // ==================================================================
    const setActiveNav = (activeView) => {
        mainNav.querySelectorAll('.nav-item').forEach(li => li.classList.remove('active'));
        if (activeView === 'projects') {
            projectsNavItem.classList.add('active');
        } else {
            const activeLink = mainNav.querySelector(`a[data-view="${activeView}"]`);
            if(activeLink) {
                activeLink.closest('.nav-item').classList.add('active');
            }
        }
    };
    
    const switchView = (viewName) => {
        mainViews.forEach(view => view.classList.add('view-hidden'));
        const viewToShow = document.getElementById(`view-${viewName}`);
        if (viewToShow) {
            viewToShow.classList.remove('view-hidden');
        }
        setActiveNav(viewName);
        // Chama funções específicas da view
        if (viewName === 'dashboard-full') renderGlobalDashboard();
        // Adicionar chamadas para outras views se necessário, como settings
    };
    
    mainNav.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        if (link.id === 'project-toggle-btn') {
            e.preventDefault();
            projectsNavItem.classList.toggle('expanded');
            projectSubmenu.classList.toggle('collapsed');
            // Se o submenu estiver aberto e nenhum projeto ativo, vai para a view de projetos
            if (projectsNavItem.classList.contains('expanded') && !activeProjectId) {
                switchView('projects');
            }
        }
        if (link.dataset.view) {
            e.preventDefault();
            switchView(link.dataset.view);
        }
    });

    // ==================================================================
    // --- LÓGICA DE DADOS (PROJETOS E TAREFAS com Supabase) ---
    // ==================================================================
    const loadInitialData = async () => {
        if (!user) return;
        await loadProjects();
        if (projects.length > 0) {
            const lastActive = localStorage.getItem(`lastActiveProject_${user.id}`);
            const projectExists = projects.some(p => p.id == lastActive);
            activeProjectId = projectExists ? parseInt(lastActive) : projects[0].id;
            await loadTasks(activeProjectId);
        } else {
            activeProjectId = null;
            tasks = [];
        }
        switchView('projects');
        renderAll();
    };

    const loadProjects = async () => { const { data, error } = await _supabase.from('projects').select('*').eq('user_id', user.id); if (error) { console.error("Erro ao carregar projetos:", error); projects = []; } else { projects = data; } };
    const loadTasks = async (projectId) => { if (!projectId) { tasks = []; return; } const { data, error } = await _supabase.from('tasks').select('*').eq('project_id', projectId); if (error) { console.error("Erro ao carregar tarefas:", error); tasks = []; } else { tasks = data; } };
    const renderAll = () => { renderProjects(); renderTasks(); };

    const renderProjects = () => {
        projectList.innerHTML = '';
        projects.forEach(project => {
            const li = document.createElement('li');
            li.dataset.projectId = project.id;
            li.className = (project.id === activeProjectId) ? 'active-project' : '';
            li.innerHTML = `<span class="project-name">${project.name}</span>`;
            projectList.appendChild(li);
        });
    };

    const renderTasks = () => {
        kanbanBoard.innerHTML = '';
        const activeProject = projects.find(p => p.id === activeProjectId);
        currentProjectTitle.textContent = activeProject ? activeProject.name : "Selecione um Projeto";
        if (!activeProject) { taskCounter.textContent = 'Crie ou selecione um projeto para começar.'; return; }
        const pendingTasks = tasks.filter(t => t.status !== 'Concluído').length;
        taskCounter.textContent = `${pendingTasks} tarefas pendentes.`;
        const statuses = ['A Fazer', 'Em Andamento', 'Concluído'];
        statuses.forEach(status => {
            const column = document.createElement('div');
            column.className = 'kanban-column';
            column.dataset.status = status;
            const tasksInColumn = tasks.filter(task => task.status === status);
            column.innerHTML = `<h3>${status}<span class="task-count">${tasksInColumn.length}</span></h3><div class="tasks-container"></div>`;
            const tasksContainer = column.querySelector('.tasks-container');
            tasksInColumn.forEach(task => tasksContainer.appendChild(createTaskCard(task)));
            kanbanBoard.appendChild(column);
        });
    };

    const createTaskCard = (task) => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.taskId = task.id;
        card.draggable = true;
        const priorityMap = { high: 'Alta', medium: 'Média', low: 'Baixa' };
        card.innerHTML = `<button class="details-btn" title="Ver Detalhes"><span class="material-symbols-outlined">more_vert</span></button><div class="task-card-header"><span>${task.text}</span>${task.priority ? `<span class="priority-badge priority-${task.priority}">${priorityMap[task.priority]}</span>` : ''}</div><div class="task-card-footer"><span>${task.due_date ? `Vence: ${new Date(task.due_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}` : 'Sem data'}</span></div>`;
        if (task.status !== 'Concluído' && task.due_date && new Date(task.due_date) < new Date().setHours(0,0,0,0)) { card.classList.add('overdue'); }
        return card;
    };
    
    // --- FUNÇÕES DO MODAL DE TAREFAS ---
    const openTaskModal = (task) => { activeTask = task; if (!task) return; modalTaskTitle.textContent = task.text; renderModalDetails(task); /* renderComments(); */ modalOverlay.classList.add('visible'); };
    const renderModalDetails = (task) => { const priorityMap = { high: 'Alta', medium: 'Média', low: 'Baixa' }; const createdAt = task.created_at ? new Date(task.created_at).toLocaleString('pt-BR') : 'N/D'; const dueDateText = task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não definido'; const statusText = task.status || 'A Fazer'; const priorityText = priorityMap[task.priority] || 'Não definida'; modalTaskDetails.innerHTML = `<div class="detail-item"><div class="detail-item-title"><span class="material-symbols-outlined">layers</span> Status</div><div class="detail-item-value">${statusText}</div></div><div class="detail-item"><div class="detail-item-title"><span class="material-symbols-outlined">flag</span> Prioridade</div><div class="detail-item-value">${priorityText}</div></div><div class="detail-item"><div class="detail-item-title"><span class="material-symbols-outlined">calendar_today</span> Vencimento</div><div class="detail-item-value editable-date" id="modal-due-date-wrapper"><span>${dueDateText}</span><button class="action-btn" id="edit-due-date-btn">Editar</button></div></div><div class="detail-item"><div class="detail-item-title"><span class="material-symbols-outlined">schedule</span> Criada em</div><div class="detail-item-value">${createdAt}</div></div>`; };
    const closeTaskModal = () => { modalOverlay.classList.remove('visible'); activeTask = null; };
    
    // ==================================================================
    // --- EVENT LISTENERS DA APLICAÇÃO ---
    // ==================================================================
    projectForm.addEventListener('submit', async (e) => { e.preventDefault(); const name = projectInput.value.trim(); if (name && user) { const { data, error } = await _supabase.from('projects').insert([{ name: name, user_id: user.id }]).select(); if (error) { showNotification('Erro ao criar projeto.', 'error'); } else { projectInput.value = ''; await loadProjects(); activeProjectId = data[0].id; await loadTasks(activeProjectId); renderAll(); } } });
    projectList.addEventListener('click', async (e) => { const li = e.target.closest('li[data-project-id]'); if (li) { activeProjectId = parseInt(li.dataset.projectId); localStorage.setItem(`lastActiveProject_${user.id}`, activeProjectId); await loadTasks(activeProjectId); renderAll(); } });
    taskForm.addEventListener('submit', async (e) => { e.preventDefault(); const text = taskForm.querySelector('#task-input').value.trim(); const due_date = taskForm.querySelector('#task-due-date').value; const priority = taskForm.querySelector('#task-priority').value; if (text && activeProjectId && user) { const { error } = await _supabase.from('tasks').insert([{ text, due_date: due_date || null, priority, status: 'A Fazer', project_id: activeProjectId, user_id: user.id }]); if (error) { showNotification('Erro ao criar tarefa.', 'error'); } else { taskForm.reset(); await loadTasks(activeProjectId); renderAll(); } } });

    // Listeners do Modal
    kanbanBoard.addEventListener('click', (e) => { const detailsButton = e.target.closest('.details-btn'); if(detailsButton) { const card = detailsButton.closest('.task-card'); if(card) { const task = tasks.find(t => t.id == card.dataset.taskId); openTaskModal(task); } } });
    modalCloseBtn.addEventListener('click', closeTaskModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeTaskModal(); });
    modalTaskDetails.addEventListener('click', async e => {
        if (e.target.id === 'edit-due-date-btn') { const wrapper = document.getElementById('modal-due-date-wrapper'); const toISODate = (dateString) => dateString ? new Date(dateString).toISOString().split('T')[0] : ''; wrapper.innerHTML = `<input type="date" class="editable-date-input" value="${toISODate(activeTask.due_date)}"><button class="action-btn" id="save-due-date-btn">Salvar</button>`; }
        if (e.target.id === 'save-due-date-btn') {
            const input = document.querySelector('.editable-date-input');
            const { error } = await _supabase.from('tasks').update({ due_date: input.value || null }).eq('id', activeTask.id);
            if(error){ showNotification('Erro ao atualizar data.', 'error'); } else { activeTask.due_date = input.value || null; await loadTasks(activeProjectId); renderAll(); renderModalDetails(activeTask); showNotification('Data de vencimento atualizada!'); }
        }
    });

    // Drag and Drop
    let draggedTaskId = null;
    kanbanBoard.addEventListener('dragstart', e => { if (e.target.classList.contains('task-card')) { draggedTaskId = e.target.dataset.taskId; e.target.classList.add('dragging'); } });
    kanbanBoard.addEventListener('dragend', e => { if (e.target.classList.contains('task-card')) { e.target.classList.remove('dragging'); } });
    kanbanBoard.addEventListener('dragover', e => { e.preventDefault(); });
    kanbanBoard.addEventListener('drop', async (e) => { e.preventDefault(); const column = e.target.closest('.kanban-column'); if (column && draggedTaskId) { const newStatus = column.dataset.status; const { error } = await _supabase.from('tasks').update({ status: newStatus }).eq('id', draggedTaskId); if(error) { showNotification('Erro ao mover tarefa.', 'error'); } else { const movedTask = tasks.find(t => t.id == draggedTaskId); if(movedTask) movedTask.status = newStatus; renderAll(); } } });
    
    const showNotification = (message, type = 'success') => { const notification = document.createElement('div'); notification.className = `toast ${type}`; notification.textContent = message; notificationContainer.appendChild(notification); setTimeout(() => notification.remove(), 3500); };
});
