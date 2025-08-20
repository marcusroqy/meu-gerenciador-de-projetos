document.addEventListener('DOMContentLoaded', () => {

    // ==================================================================
    // --- CONFIGURAÇÃO DO SUPABASE ---
    // ==================================================================
    const SUPABASE_URL = 'COLE_SUA_URL_AQUI';
    const SUPABASE_ANON_KEY = 'COLE_SUA_CHAVE_ANON_AQUI';

    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ==================================================================
    // --- SELEÇÃO DOS ELEMENTOS ---
    // ==================================================================
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const signOutBtn = document.getElementById('sign-out-btn');
    const notificationContainer = document.getElementById('notification-container');
    
    const projectForm = document.getElementById('project-form');
    const projectInput = document.getElementById('project-input');
    const projectList = document.getElementById('project-list');
    
    const currentProjectTitle = document.getElementById('current-project-title');
    const taskCounter = document.getElementById('task-counter');
    const taskForm = document.getElementById('task-form');
    const kanbanBoard = document.getElementById('kanban-board');
    
    const userAvatar = document.querySelector('.user-avatar');
    const userNameSpan = document.querySelector('.sidebar-header span');

    const mainNav = document.querySelector('.main-nav');

    // --- ESTRUTURA DE DADOS E ESTADO ---
    let user = null;
    let projects = [];
    let tasks = [];
    let activeProjectId = null;

    // --- FUNÇÃO DE NOTIFICAÇÃO ---
    const showNotification = (message, type = 'success') => { const n = document.createElement('div'); n.className = `toast ${type}`; n.textContent = message; notificationContainer.appendChild(n); setTimeout(() => n.remove(), 3500); };

    // --- FUNÇÃO PARA CONTROLAR AS VISTAS (PÁGINAS) ---
    const showMainView = (viewId) => {
        document.querySelectorAll('.main-view').forEach(view => view.classList.add('view-hidden'));
        document.querySelectorAll('.main-nav .nav-item').forEach(item => item.classList.remove('active'));

        const viewToShow = document.getElementById(viewId);
        const navLink = mainNav.querySelector(`a[data-view="${viewId.replace('view-', '')}"]`);

        if (viewToShow) viewToShow.classList.remove('view-hidden');
        if (navLink) navLink.closest('.nav-item').classList.add('active');
    };

    // ==================================================================
    // --- LÓGICA DE AUTENTICAÇÃO ---
    // ==================================================================
    _supabase.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
            user = session.user;
            authView.classList.add('view-hidden');
            appView.classList.remove('view-hidden');
            userNameSpan.textContent = user.email;
            userAvatar.textContent = user.email.charAt(0).toUpperCase();
            await loadInitialData();
        } else {
            user = null;
            authView.classList.remove('view-hidden');
            appView.classList.add('view-hidden');
        }
    });

    registerForm.addEventListener('submit', async (e) => { e.preventDefault(); const email = e.target.querySelector('#register-email').value; const password = e.target.querySelector('#register-password').value; const { error } = await _supabase.auth.signUp({ email, password }); if (error) { showNotification(`Erro: ${error.message}`, 'error'); } else { showNotification('Conta criada! Verifique seu email.', 'success'); showLoginLink.click(); } });
    loginForm.addEventListener('submit', async (e) => { e.preventDefault(); const email = e.target.querySelector('#login-email').value; const password = e.target.querySelector('#login-password').value; const { error } = await _supabase.auth.signInWithPassword({ email, password }); if (error) showNotification(`Erro: ${error.message}`, 'error'); });
    signOutBtn.addEventListener('click', async () => { await _supabase.auth.signOut(); });
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-form-container').classList.add('view-hidden'); document.getElementById('register-form-container').classList.remove('view-hidden'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('register-form-container').classList.add('view-hidden'); document.getElementById('login-form-container').classList.remove('view-hidden'); });

    // ==================================================================
    // --- LÓGICA DE DADOS E RENDERIZAÇÃO ---
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
        renderAll();
    };

    const loadProjects = async () => { const { data } = await _supabase.from('projects').select('*').eq('user_id', user.id); projects = data || []; };
    const loadTasks = async (projectId) => { if (!projectId) { tasks = []; return; } const { data } = await _supabase.from('tasks').select('*').eq('project_id', projectId); tasks = data || []; };
    
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
        currentProjectTitle.textContent = activeProject ? activeProject.name : "Nenhum projeto";
        if (!activeProject) { taskCounter.textContent = 'Crie ou selecione um projeto.'; return; }
        const pendingTasks = tasks.filter(t => t.status !== 'Concluído').length;
        taskCounter.textContent = `${pendingTasks} tarefas pendentes.`;
        const statuses = ['A Fazer', 'Em Andamento', 'Concluído'];
        statuses.forEach(status => {
            const column = document.createElement('div');
            column.className = 'kanban-column';
            column.dataset.status = status;
            column.innerHTML = `<h3>${status}</h3><div class="tasks-container"></div>`;
            const tasksContainer = column.querySelector('.tasks-container');
            tasks.filter(t => t.status === status).forEach(task => tasksContainer.appendChild(createTaskCard(task)));
            kanbanBoard.appendChild(column);
        });
    };

    const createTaskCard = (task) => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.taskId = task.id;
        card.draggable = true;
        card.innerHTML = `<span>${task.text}</span>`;
        return card;
    };
    
    // ==================================================================
    // --- EVENT LISTENERS DA APLICAÇÃO ---
    // ==================================================================
    mainNav.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link && link.dataset.view) {
            e.preventDefault();
            showMainView(`view-${link.dataset.view}`);
        }
    });

    projectForm.addEventListener('submit', async (e) => { e.preventDefault(); const name = projectInput.value.trim(); if (name && user) { const { data } = await _supabase.from('projects').insert([{ name, user_id: user.id }]).select(); if (data) { projectInput.value = ''; await loadProjects(); activeProjectId = data[0].id; await loadTasks(activeProjectId); renderAll(); } } });
    projectList.addEventListener('click', async (e) => { const li = e.target.closest('li[data-project-id]'); if (li) { activeProjectId = parseInt(li.dataset.projectId); localStorage.setItem(`lastActiveProject_${user.id}`, activeProjectId); await loadTasks(activeProjectId); renderAll(); } });
    taskForm.addEventListener('submit', async (e) => { e.preventDefault(); const text = e.target.querySelector('#task-input').value.trim(); if (text && activeProjectId && user) { await _supabase.from('tasks').insert([{ text, status: 'A Fazer', project_id: activeProjectId, user_id: user.id }]); e.target.reset(); await loadTasks(activeProjectId); renderAll(); } });

    let draggedTaskId = null;
    kanbanBoard.addEventListener('dragstart', e => { if (e.target.classList.contains('task-card')) { draggedTaskId = e.target.dataset.taskId; e.target.classList.add('dragging'); } });
    kanbanBoard.addEventListener('dragend', e => { if (e.target.classList.contains('task-card')) { e.target.classList.remove('dragging'); } });
    kanbanBoard.addEventListener('dragover', e => { e.preventDefault(); });
    kanbanBoard.addEventListener('drop', async (e) => { e.preventDefault(); const column = e.target.closest('.kanban-column'); if (column && draggedTaskId) { const newStatus = column.dataset.status; await _supabase.from('tasks').update({ status: newStatus }).eq('id', draggedTaskId); const movedTask = tasks.find(t => t.id == draggedTaskId); if(movedTask) movedTask.status = newStatus; renderAll(); } });
    
    // --- INICIALIZAÇÃO ---
    showMainView('projects'); // Garante que a vista de projetos é a inicial
});
