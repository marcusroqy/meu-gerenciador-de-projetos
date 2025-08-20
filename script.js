document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://egishguoptqbxmsnhngf.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnaXNoZ3VvcHRxYnhtc25obmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NDMzODksImV4cCI6MjA3MTIxOTM4OX0.RmbvPa2h5Jl33A1LetqufGw7kuGPJZKouT0VEp2icxw';

    if (typeof supabase === 'undefined') {
        alert('Supabase não foi carregado!');
        return;
    }

    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const signOutBtn = document.getElementById('sign-out-btn');
    const notificationContainer = document.getElementById('notification-container');

    const mainNav = document.querySelector('.main-nav ul');
    const mainViews = document.querySelectorAll('.main-view');

    const projectForm = document.getElementById('project-form');
    const projectInput = document.getElementById('project-input');
    const projectList = document.getElementById('project-list');
    const currentProjectTitle = document.getElementById('current-project-title');
    const taskCounter = document.getElementById('task-counter');
    const taskForm = document.getElementById('task-form');
    const kanbanBoard = document.getElementById('kanban-board');
    const userAvatar = document.querySelector('.user-avatar');
    const userNameSpan = document.querySelector('.sidebar-header span');

    let user = null;
    let projects = [];
    let tasks = [];
    let activeProjectId = null;

    // Autenticação
    _supabase.auth.onAuthStateChange(async (_event, session) => {
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
            loginFormContainer.classList.remove('view-hidden');
            registerFormContainer.classList.add('view-hidden');
        }
    });

    // Alternância entre formulários
    showRegisterLink?.addEventListener('click', e => {
        e.preventDefault();
        loginFormContainer.classList.add('view-hidden');
        registerFormContainer.classList.remove('view-hidden');
    });
    showLoginLink?.addEventListener('click', e => {
        e.preventDefault();
        registerFormContainer.classList.add('view-hidden');
        loginFormContainer.classList.remove('view-hidden');
    });

    registerForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const { error } = await _supabase.auth.signUp({ email, password });
        if (error) {
            showNotification(`Erro: ${error.message}`, 'error');
        } else {
            showNotification('Conta criada! Confirme seu email para logar.', 'success');
            showLoginLink.click();
        }
    });

    loginForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) showNotification(`Erro: ${error.message}`, 'error');
    });

    signOutBtn?.addEventListener('click', async () => {
        await _supabase.auth.signOut();
    });

    // Lógica dados e navegação
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

    const loadProjects = async () => {
        const { data, error } = await _supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (error) {
            console.error('Erro ao carregar projetos:', error);
            projects = [];
        } else {
            projects = data || [];
        }
    };

    const loadTasks = async (projectId) => {
        if (!projectId) { tasks = []; return; }
        const { data, error } = await _supabase.from('tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
        if (error) {
            console.error('Erro ao carregar tarefas:', error);
            tasks = [];
        } else {
            tasks = data || [];
        }
    };

    const renderAll = () => {
        renderProjects();
        renderTasks();
    };

    const renderProjects = () => {
        if (!projectList) return;
        projectList.innerHTML = '';
        projects.forEach(project => {
            const li = document.createElement('li');
            li.dataset.projectId = project.id;
            li.className = (project.id === activeProjectId) ? 'active-project' : '';
            li.innerHTML = `<span class="project-name">${project.name}</span>`;
            li.addEventListener('click', () => selectProject(project.id));
            projectList.appendChild(li);
        });
    };

    const selectProject = async (projectId) => {
        activeProjectId = projectId;
        localStorage.setItem(`lastActiveProject_${user.id}`, activeProjectId);
        await loadTasks(activeProjectId);
        renderAll();
        switchView('projects');
    };

    const renderTasks = () => {
        if (!kanbanBoard) return;
        kanbanBoard.innerHTML = '';
        const activeProject = projects.find(p => p.id === activeProjectId);
        if (currentProjectTitle) currentProjectTitle.textContent = activeProject ? activeProject.name : "Selecione um Projeto";
        if (!activeProject) {
            if (taskCounter) taskCounter.textContent = 'Crie ou selecione um projeto.';
            return;
        }
        const pendingTasks = tasks.filter(t => t.status !== 'Concluído').length;
        const overdueTasks = tasks.filter(t => t.due_date && isOverdue(t.due_date)).length;
        if (taskCounter) {
            let counterText = `${pendingTasks} tarefas pendentes`;
            if (overdueTasks > 0) {
                counterText += ` • ${overdueTasks} atrasadas`;
            }
            taskCounter.textContent = counterText;
        }
        const statuses = ['A Fazer', 'Em Andamento', 'Concluído'];
        statuses.forEach(status => {
            const column = document.createElement('div');
            column.className = 'kanban-column';
            column.dataset.status = status;
            const statusCount = tasks.filter(t => t.status === status).length;
            column.innerHTML = `<h3>${status} <span class="task-count">(${statusCount})</span></h3><div class="tasks-container"></div>`;
            const tasksContainer = column.querySelector('.tasks-container');
            tasks.filter(t => t.status === status).forEach(task => {
                tasksContainer.appendChild(createTaskCard(task));
            });
            kanbanBoard.appendChild(column);
        });
    };

    // More functions (createTaskCard, editTask, saveTask, etc.) remain same (from previous full JS provided).
    
    // Navigation event
    if (mainNav) {
        mainNav.addEventListener('click', e => {
            e.preventDefault();
            const link = e.target.closest('a[data-view]');
            if(link){
                switchView(link.dataset.view);
            }
        });
    }

    const switchView = (viewName) => {
        mainViews.forEach(view => view.classList.add('view-hidden'));
        const viewToShow = document.getElementById(`view-${viewName}`);
        if (viewToShow) viewToShow.classList.remove('view-hidden');
        if (mainNav) {
            mainNav.querySelectorAll('.nav-item').forEach(li => li.classList.remove('active'));
            const activeLink = mainNav.querySelector(`a[data-view="${viewName}"]`);
            if (activeLink) activeLink.closest('.nav-item').classList.add('active');
        }
    };

    // Utility functions for date and priority colors (isOverdue, isDueSoon, getPriorityColor, getPriorityLabel)...

    // And task edit, save, delete modal functions, drag and drop...
    
    // Show notification function...
});
