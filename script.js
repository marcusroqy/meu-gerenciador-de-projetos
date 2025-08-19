document.addEventListener('DOMContentLoaded', () => {

    // ==================================================================
    // --- CONFIGURAÇÃO DO SUPABASE ---
    // ==================================================================
    // !! IMPORTANTE !! Cole suas chaves do Supabase aqui
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
    
    const mainNav = document.querySelector('.main-nav ul');
    const mainViews = document.querySelectorAll('.main-view');
    const projectsNavItem = document.getElementById('projects-nav-item');
    
    const projectForm = document.getElementById('project-form');
    const projectInput = document.getElementById('project-input');
    const projectList = document.getElementById('project-list');
    
    const currentProjectTitle = document.getElementById('current-project-title');
    const taskCounter = document.getElementById('task-counter');
    const taskForm = document.getElementById('task-form');
    const kanbanBoard = document.getElementById('kanban-board');
    
    const userAvatar = document.querySelector('.user-avatar');
    const userNameSpan = document.querySelector('.sidebar-header span');

    // --- ESTRUTURA DE DADOS E ESTADO ---
    let user = null;
    let projects = [];
    let tasks = [];
    let activeProjectId = null;

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

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const { error } = await _supabase.auth.signUp({ email, password });
        if (error) {
            showNotification(`Erro: ${error.message}`, 'error');
        } else {
            showNotification('Conta criada! Verifique seu email para confirmação, se necessário.', 'success');
            showLoginLink.click();
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) showNotification(`Erro: ${error.message}`, 'error');
    });

    signOutBtn.addEventListener('click', async () => {
        await _supabase.auth.signOut();
    });

    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-form-container').classList.add('view-hidden'); document.getElementById('register-form-container').classList.remove('view-hidden'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('register-form-container').classList.add('view-hidden'); document.getElementById('login-form-container').classList.remove('view-hidden'); });

    // ==================================================================
    // --- LÓGICA DE NAVEGAÇÃO E DADOS ---
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

    const loadProjects = async () => { const { data, error } = await _supabase.from('projects').select('*').eq('user_id', user.id); if (error) { projects = []; } else { projects = data; } };
    const loadTasks = async (projectId) => { if (!projectId) { tasks = []; return; } const { data, error } = await _supabase.from('tasks').select('*').eq('project_id', projectId); if (error) { tasks = []; } else { tasks = data; } };
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
    projectForm.addEventListener('submit', async (e) => { e.preventDefault(); const name = projectInput.value.trim(); if (name && user) { const { data, error } = await _supabase.from('projects').insert([{ name, user_id: user.id }]).select(); if (error) { showNotification('Erro ao criar projeto.', 'error'); } else { projectInput.value = ''; await loadProjects(); activeProjectId = data[0].id; await loadTasks(activeProjectId); renderAll(); } } });
    projectList.addEventListener('click', async (e) => { const li = e.target.closest('li[data-project-id]'); if (li) { activeProjectId = parseInt(li.dataset.projectId); localStorage.setItem(`lastActiveProject_${user.id}`, activeProjectId); await loadTasks(activeProjectId); renderAll(); } });
    taskForm.addEventListener('submit', async (e) => { e.preventDefault(); const text = taskForm.querySelector('#task-input').value.trim(); const due_date = taskForm.querySelector('#task-due-date').value; const priority = taskForm.querySelector('#task-priority').value; if (text && activeProjectId && user) { const { error } = await _supabase.from('tasks').insert([{ text, due_date: due_date || null, priority, status: 'A Fazer', project_id: activeProjectId, user_id: user.id }]); if (error) { showNotification('Erro ao criar tarefa.', 'error'); } else { taskForm.reset(); await loadTasks(activeProjectId); renderAll(); } } });

    let draggedTaskId = null;
    kanbanBoard.addEventListener('dragstart', e => { if (e.target.classList.contains('task-card')) { draggedTaskId = e.target.dataset.taskId; e.target.classList.add('dragging'); } });
    kanbanBoard.addEventListener('dragend', e => { if (e.target.classList.contains('task-card')) { e.target.classList.remove('dragging'); } });
    kanbanBoard.addEventListener('dragover', e => { e.preventDefault(); });
    kanbanBoard.addEventListener('drop', async (e) => { e.preventDefault(); const column = e.target.closest('.kanban-column'); if (column && draggedTaskId) { const newStatus = column.dataset.status; const { error } = await _supabase.from('tasks').update({ status: newStatus }).eq('id', draggedTaskId); if(error) { showNotification('Erro ao mover tarefa.', 'error'); } else { const movedTask = tasks.find(t => t.id == draggedTaskId); if(movedTask) movedTask.status = newStatus; renderAll(); } } });

    const showNotification = (message, type = 'success') => { const notification = document.createElement('div'); notification.className = `toast ${type}`; notification.textContent = message; notificationContainer.appendChild(notification); setTimeout(() => notification.remove(), 3500); };
});
