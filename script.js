document.addEventListener('DOMContentLoaded', () => {

    // ==================================================================
    // --- LÓGICA DE TEMA ---
    // ==================================================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const applyTheme = (theme) => {
        const icon = themeToggleBtn.querySelector('.material-symbols-outlined');
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            if (icon) icon.textContent = 'light_mode';
        } else {
            document.body.classList.remove('dark-mode');
            if (icon) icon.textContent = 'dark_mode';
        }
        localStorage.setItem('theme', theme);
    };

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            applyTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark');
        });
    }

    // ==================================================================
    // --- LÓGICA DE NAVEGAÇÃO (REVISADA E CORRIGIDA) ---
    // ==================================================================
    const mainNav = document.querySelector('.main-nav ul');
    const mainViews = document.querySelectorAll('.main-view');
    const projectToggleBtn = document.getElementById('project-toggle-btn');
    const projectsNavItem = document.getElementById('projects-nav-item');
    const projectSubmenu = document.querySelector('.project-submenu');

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
        if (viewName === 'home') loadInbox();
        if (viewName === 'dashboard-full') renderGlobalDashboard();
        if (viewName === 'settings') populateSettingsForm();
    };

    // Listener para todos os links da navegação principal
    mainNav.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        
        // Se for o botão de toggle dos projetos, apenas expande/recolhe
        if(link.id === 'project-toggle-btn') {
            e.preventDefault();
            projectsNavItem.classList.toggle('expanded');
            projectSubmenu.classList.toggle('collapsed');
        }
        
        // Se for qualquer outro link com data-view, troca a view
        if (link.dataset.view) {
            e.preventDefault();
            switchView(link.dataset.view);
        }
    });

    // ==================================================================
    // --- SELEÇÃO DOS ELEMENTOS GLOBAIS ---
    // ==================================================================
    const projectForm = document.getElementById('project-form');
    const projectInput = document.getElementById('project-input');
    const projectList = document.getElementById('project-list');
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskDueDateInput = document.getElementById('task-due-date');
    const taskPriorityInput = document.getElementById('task-priority');
    const currentProjectTitle = document.getElementById('current-project-title');
    const taskCounter = document.getElementById('task-counter');
    const kanbanBoard = document.getElementById('kanban-board');
    const notificationContainer = document.getElementById('notification-container');
    const modalOverlay = document.getElementById('task-details-modal');
    const modalCloseBtn = modalOverlay.querySelector('.modal-close-btn');
    const modalTaskTitle = document.getElementById('modal-task-title');
    const modalTaskDetails = document.getElementById('modal-task-details');
    const commentForm = document.getElementById('comment-form');
    const commentInput = document.getElementById('comment-input');
    const commentList = document.getElementById('comment-list');
    const inboxList = document.getElementById('inbox-list');
    const inboxViewer = document.getElementById('inbox-viewer');
    const refreshInboxBtn = document.getElementById('refresh-inbox-btn');
    
    let projects = {};
    let userProfile = {};
    let emails = [];
    let activeProjectId = null;
    let activeTaskIndex = null;
    let globalStatusChart = null;
    
    // ==================================================================
    // --- FUNÇÕES DE DADOS (localStorage) ---
    // ==================================================================
    const saveData = () => { localStorage.setItem('todoAppProjects', JSON.stringify(projects)); localStorage.setItem('todoAppActiveProject', activeProjectId); };
    const saveUserProfile = () => { localStorage.setItem('todoAppUserProfile', JSON.stringify(userProfile)); };
    const loadData = () => { const p = localStorage.getItem('todoAppProjects'); projects = p ? JSON.parse(p) : {}; activeProjectId = localStorage.getItem('todoAppActiveProject'); if (Object.keys(projects).length === 0) { addProject('Meu Primeiro Projeto', true); } else if (!projects[activeProjectId] || !Object.keys(projects).includes(activeProjectId)) { setActiveProject(Object.keys(projects)[0]); } else { setActiveProject(activeProjectId); } };
    const loadUserProfile = () => { const profileData = localStorage.getItem('todoAppUserProfile'); userProfile = profileData ? JSON.parse(profileData) : { name: 'Marcus Roque', username: 'marcus-roque', email: '', avatar: null }; updateSidebarHeader(); };

    // --- FUNÇÃO DE NOTIFICAÇÃO ---
    const showNotification = (message, type = 'success') => { const notification = document.createElement('div'); notification.className = `toast ${type}`; notification.textContent = message; notificationContainer.appendChild(notification); setTimeout(() => notification.remove(), 3500); };
    
    // ==================================================================
    // --- FUNÇÕES DA CAIXA DE ENTRADA (INBOX) ---
    // ==================================================================
    const loadInbox = async () => { if (!inboxList) return; inboxList.innerHTML = '<p class="inbox-placeholder">Nenhum email encontrado.</p>'; emails = []; renderInboxList(); };
    const renderInboxList = () => { inboxList.innerHTML = ''; if (emails.length === 0) { inboxList.innerHTML = '<p class="inbox-placeholder">Nenhum email encontrado.</p>'; return; } emails.forEach((email, index) => { const item = document.createElement('div'); item.className = 'email-item'; item.dataset.index = index; const date = new Date(email.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); item.innerHTML = `<div class="email-item-header"><span class="email-item-sender">${email.from}</span><span class="email-item-date">${date}</span></div><div class="email-item-subject">${email.subject}</div>`; inboxList.appendChild(item); }); };
    const viewEmail = (index) => { const email = emails[index]; if (!email) return; inboxList.querySelectorAll('.email-item').forEach(item => item.classList.remove('active')); inboxList.querySelector(`.email-item[data-index="${index}"]`).classList.add('active'); const date = new Date(email.date).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' }); inboxViewer.innerHTML = `<div class="viewer-header"><h2 class="viewer-subject">${email.subject}</h2><div class="viewer-meta"><strong>De:</strong> ${email.from} <br><strong>Para:</strong> ${email.to} <br><strong>Data:</strong> ${date}</div></div><div class="viewer-body">${email.body}</div>`; };
    
    // ==================================================================
    // --- FUNÇÕES DE PERFIL (SETTINGS) ---
    // ==================================================================
    const updateSidebarHeader = () => { const sidebarName = document.querySelector('.sidebar-header span'); const sidebarAvatar = document.querySelector('.user-avatar'); if(!sidebarName || !sidebarAvatar) return; sidebarName.textContent = userProfile.name || 'Usuário'; if(userProfile.avatar) { sidebarAvatar.innerHTML = `<img src="${userProfile.avatar}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`; } else { sidebarAvatar.innerHTML = (userProfile.name || 'U').charAt(0).toUpperCase(); } };
    const populateSettingsForm = () => { document.getElementById('full-name').value = userProfile.name || ''; document.getElementById('username').value = userProfile.username || ''; document.getElementById('email').value = userProfile.email || ''; document.getElementById('avatar-preview').src = userProfile.avatar || 'https://i.imgur.com/3Y2gpN9.png'; document.getElementById('new-password').value = ''; document.getElementById('confirm-password').value = ''; };

    // ==================================================================
    // --- FUNÇÕES DO DASHBOARD GERAL ---
    // ==================================================================
     const renderGlobalDashboard = () => { if (typeof Chart === 'undefined') return; let totalProjects = Object.keys(projects).length; let totalTasks = 0; let completedTasks = 0; const globalStatusCounts = { 'A Fazer': 0, 'Em Andamento': 0, 'Concluído': 0 }; for (const projectId in projects) { if (projects[projectId].tasks) { const projectTasks = projects[projectId].tasks; totalTasks += projectTasks.length; projectTasks.forEach(task => { if (task.status === 'Concluído') completedTasks++; if (globalStatusCounts[task.status] !== undefined) globalStatusCounts[task.status]++; }); } } document.getElementById('db-total-projects').textContent = totalProjects; document.getElementById('db-total-tasks').textContent = totalTasks; document.getElementById('db-completed-tasks').textContent = completedTasks; const canvas = document.getElementById('global-status-chart'); if (!canvas) return; if (globalStatusChart) globalStatusChart.destroy(); const computedStyles = getComputedStyle(document.documentElement); const chartTextColor = document.body.classList.contains('dark-mode') ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.6)'; globalStatusChart = new Chart(canvas, { type: 'bar', data: { labels: Object.keys(globalStatusCounts), datasets: [{ label: 'Total de Tarefas', data: Object.values(globalStatusCounts), backgroundColor: [ computedStyles.getPropertyValue('--priority-medium').trim(), computedStyles.getPropertyValue('--accent-secondary').trim(), computedStyles.getPropertyValue('--priority-low').trim() ], borderRadius: 4, }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { color: chartTextColor, stepSize: 1 } }, x: { ticks: { color: chartTextColor } } } } }); };

    // --- FUNÇÃO DE RENDERIZAÇÃO MESTRE ---
    const renderAll = () => { saveData(); renderProjects(); renderTasks(); };

    // ==================================================================
    // --- FUNÇÕES DE PROJETO ---
    // ==================================================================
    const renderProjects = () => { projectList.innerHTML = ''; if (Object.keys(projects).length === 0) return; Object.keys(projects).forEach(id => { const li = document.createElement('li'); li.dataset.projectId = id; if (id === activeProjectId) li.classList.add('active-project'); li.innerHTML = `<span class="project-name">${id}</span>`; projectList.appendChild(li); }); };
    const setActiveProject = (id) => { activeProjectId = id; switchView('projects'); renderAll(); };
    const addProject = (name, isInitial = false) => { if (projects[name]) { if (!isInitial) showNotification('Um projeto com este nome já existe.', 'error'); return; } projects[name] = { tasks: [] }; if (!isInitial) showNotification(`Projeto "${name}" criado!`, 'success'); setActiveProject(name); };

    // ==================================================================
    // --- FUNÇÕES DE TAREFA (KANBAN) ---
    // ==================================================================
    const renderTasks = () => { kanbanBoard.innerHTML = ''; currentProjectTitle.textContent = activeProjectId || 'Selecione um Projeto'; if (!activeProjectId || !projects[activeProjectId]) { taskCounter.textContent = 'Adicione ou selecione um projeto para começar.'; return; } const projectTasks = projects[activeProjectId].tasks; const pendingTasks = projectTasks.filter(t => t.status !== 'Concluído').length; taskCounter.textContent = `${pendingTasks} tarefas pendentes.`; const statuses = ['A Fazer', 'Em Andamento', 'Concluído']; statuses.forEach(status => { const column = document.createElement('div'); column.className = 'kanban-column'; column.dataset.status = status; const tasksInColumn = projectTasks.filter(task => task.status === status); column.innerHTML = `<h3>${status}<span class="task-count">${tasksInColumn.length}</span></h3><div class="tasks-container"></div>`; const tasksContainer = column.querySelector('.tasks-container'); tasksInColumn.forEach(task => { const originalIndex = projectTasks.findIndex(pTask => pTask === task); tasksContainer.appendChild(createTaskCard(task, originalIndex)); }); kanbanBoard.appendChild(column); }); };
    const createTaskCard = (task, index) => { const card = document.createElement('div'); card.className = 'task-card'; card.draggable = true; card.dataset.index = index; const priorityMap = { high: 'Alta', medium: 'Média', low: 'Baixa' }; card.innerHTML = `<button class="details-btn" title="Ver Detalhes"><span class="material-symbols-outlined">more_vert</span></button><div class="task-card-header"><span>${task.text}</span>${task.priority ? `<span class="priority-badge priority-${task.priority}">${priorityMap[task.priority]}</span>` : ''}</div><div class="task-card-footer"><span>${task.dueDate ? `Vence: ${new Date(task.dueDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}` : 'Sem data'}</span></div>`; if (task.status !== 'Concluído' && task.dueDate && new Date(task.dueDate) < new Date().setHours(0,0,0,0)) { card.classList.add('overdue'); } return card; };
    
    // ==================================================================
    // --- FUNÇÕES DO MODAL DE TAREFAS ---
    // ==================================================================
    const openTaskModal = (taskIndex) => { activeTaskIndex = taskIndex; const task = projects[activeProjectId].tasks[taskIndex]; if (!task) return; modalTaskTitle.textContent = task.text; renderModalDetails(task); renderComments(); modalOverlay.classList.add('visible'); };
    const renderModalDetails = (task) => { const priorityMap = { high: 'Alta', medium: 'Média', low: 'Baixa' }; const createdAt = task.createdAt ? new Date(task.createdAt).toLocaleString('pt-BR') : 'N/D'; const dueDateText = task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não definido'; const statusText = task.status || 'A Fazer'; const priorityText = priorityMap[task.priority] || 'Não definida'; modalTaskDetails.innerHTML = `<div class="detail-item"><div class="detail-item-title"><span class="material-symbols-outlined">layers</span> Status</div><div class="detail-item-value">${statusText}</div></div><div class="detail-item"><div class="detail-item-title"><span class="material-symbols-outlined">flag</span> Prioridade</div><div class="detail-item-value">${priorityText}</div></div><div class="detail-item"><div class="detail-item-title"><span class="material-symbols-outlined">calendar_today</span> Vencimento</div><div class="detail-item-value editable-date" id="modal-due-date-wrapper"><span>${dueDateText}</span><button class="action-btn" id="edit-due-date-btn">Editar</button></div></div><div class="detail-item"><div class="detail-item-title"><span class="material-symbols-outlined">schedule</span> Criada em</div><div class="detail-item-value">${createdAt}</div></div>`; };
    const renderComments = () => { commentList.innerHTML = ''; if (activeTaskIndex === null) return; const task = projects[activeProjectId].tasks[activeTaskIndex]; if (task && task.comments && task.comments.length > 0) { task.comments.forEach(comment => { const li = document.createElement('li'); li.innerHTML = `<div>${comment.text}</div><small>${new Date(comment.timestamp).toLocaleString('pt-BR')}</small>`; commentList.appendChild(li); }); } else { commentList.innerHTML = '<li>Nenhum comentário ainda.</li>'; } };
    const addComment = (text) => { if (activeTaskIndex !== null && text) { const task = projects[activeProjectId].tasks[activeTaskIndex]; if (!task.comments) task.comments = []; task.comments.push({ text, timestamp: new Date().toISOString() }); saveData(); renderComments(); commentInput.value = ''; } };
    const closeTaskModal = () => { modalOverlay.classList.remove('visible'); activeTaskIndex = null; };

    // ==================================================================
    // --- EVENT LISTENERS ---
    // ==================================================================
    projectForm.addEventListener('submit', e => { e.preventDefault(); const name = projectInput.value.trim(); if(name) addProject(name); projectInput.value = ''; });
    projectList.addEventListener('click', e => { const li = e.target.closest('li[data-project-id]'); if(li) setActiveProject(li.dataset.projectId); });
    taskForm.addEventListener('submit', e => { e.preventDefault(); const text = taskInput.value.trim(); if (text && activeProjectId) { projects[activeProjectId].tasks.push({ text, status: 'A Fazer', createdAt: new Date().toISOString(), dueDate: taskDueDateInput.value || null, priority: taskPriorityInput.value, comments: [] }); renderAll(); taskForm.reset(); taskPriorityInput.value = 'medium'; } });
    
    const settingsForm = document.getElementById('settings-form');
    const changeAvatarBtn = document.getElementById('change-avatar-btn');
    const avatarInput = document.getElementById('avatar-input');
    if(changeAvatarBtn) changeAvatarBtn.addEventListener('click', () => avatarInput.click());
    if(avatarInput) avatarInput.addEventListener('change', e => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = event => { document.getElementById('avatar-preview').src = event.target.result; userProfile.avatar = event.target.result; }; reader.readAsDataURL(file); } });
    if(settingsForm) settingsForm.addEventListener('submit', e => { e.preventDefault(); const newPassword = document.getElementById('new-password').value; if (newPassword && newPassword !== document.getElementById('confirm-password').value) { showNotification('As senhas não coincidem!', 'error'); return; } userProfile.name = document.getElementById('full-name').value; userProfile.username = document.getElementById('username').value; userProfile.email = document.getElementById('email').value; saveUserProfile(); updateSidebarHeader(); showNotification('Configurações salvas com sucesso!'); });
    
    kanbanBoard.addEventListener('click', (e) => { const detailsButton = e.target.closest('.details-btn'); if(detailsButton) { const card = detailsButton.closest('.task-card'); if(card) { openTaskModal(card.dataset.index); } } });
    modalCloseBtn.addEventListener('click', closeTaskModal);
    modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeTaskModal(); });
    commentForm.addEventListener('submit', e => { e.preventDefault(); addComment(commentInput.value.trim()); });
    
    modalTaskDetails.addEventListener('click', e => {
        if (e.target.id === 'edit-due-date-btn') {
            const task = projects[activeProjectId].tasks[activeTaskIndex]; const wrapper = document.getElementById('modal-due-date-wrapper');
            const toISODate = (dateString) => dateString ? new Date(dateString).toISOString().split('T')[0] : '';
            wrapper.innerHTML = `<input type="date" class="editable-date-input" value="${toISODate(task.dueDate)}"><button class="action-btn" id="save-due-date-btn">Salvar</button>`;
        }
        if (e.target.id === 'save-due-date-btn') {
            const task = projects[activeProjectId].tasks[activeTaskIndex]; const input = document.querySelector('.editable-date-input');
            task.dueDate = input.value || null;
            renderAll(); renderModalDetails(task); showNotification('Data de vencimento atualizada!');
        }
    });

    if(refreshInboxBtn) refreshInboxBtn.addEventListener('click', loadInbox);
    if(inboxList) inboxList.addEventListener('click', e => { const item = e.target.closest('.email-item'); if(item) { viewEmail(item.dataset.index); } });

    let draggedCardIndex = null;
    kanbanBoard.addEventListener('dragstart', e => { if (e.target.classList.contains('task-card')) { draggedCardIndex = e.target.dataset.index; setTimeout(() => e.target.classList.add('dragging'), 0); } });
    kanbanBoard.addEventListener('dragend', e => { if (e.target.classList.contains('task-card')) { e.target.classList.remove('dragging'); } });
    kanbanBoard.addEventListener('dragover', e => { e.preventDefault(); const column = e.target.closest('.kanban-column'); if (column) { document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('over')); column.classList.add('over'); } });
    kanbanBoard.addEventListener('dragleave', e => { const column = e.target.closest('.kanban-column'); if (column) { column.classList.remove('over'); } });
    kanbanBoard.addEventListener('drop', e => { e.preventDefault(); document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('over')); const column = e.target.closest('.kanban-column'); if (column && draggedCardIndex !== null) { const task = projects[activeProjectId].tasks[draggedCardIndex]; const newStatus = column.dataset.status; if (task.status !== newStatus) { task.status = newStatus; task.completedAt = (newStatus === 'Concluído') ? new Date().toISOString() : null; renderAll(); } draggedCardIndex = null; } });

    // ==================================================================
    // --- INICIALIZAÇÃO ---
    // ==================================================================
    applyTheme(localStorage.getItem('theme') || 'light');
    loadUserProfile();
    loadData();
    // Define a view inicial. Se houver um projeto ativo, vai para ele. Senão, para a caixa de entrada.
    if(activeProjectId && projects[activeProjectId]) {
        switchView('projects');
    } else {
        switchView('home');
    }
});
