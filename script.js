document.addEventListener('DOMContentLoaded', () => {
    // ==================================================================
    // --- CONFIGURAÇÃO DO SUPABASE ---
    // ==================================================================
    const SUPABASE_URL = 'https://egishguoptqbxmsnhngf.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnaXNoZ3VvcHRxYnhtc25obmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NDMzODksImV4cCI6MjA3MTIxOTM4OX0.RmbvPa2h5Jl33A1LetqufGw7kuGPJZKouT0VEp2icxw';

    if (typeof supabase === 'undefined') {
        alert('❌ Não foi possível carregar a biblioteca Supabase!');
        return;
    }

    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ==================================================================
    // --- SELEÇÃO DOS ELEMENTOS ---
    // ==================================================================
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
    let editingTaskId = null;

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
            loginFormContainer.classList.remove('view-hidden');
            registerFormContainer.classList.add('view-hidden');
        }
    });

    // --- Alternância entre formulários ---
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginFormContainer.classList.add('view-hidden');
        registerFormContainer.classList.remove('view-hidden');
    });
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerFormContainer.classList.add('view-hidden');
        loginFormContainer.classList.remove('view-hidden');
    });

    registerForm.addEventListener('submit', async (e) => {
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

    // ==================================================================
    // --- UTILITÁRIOS ---
    // ==================================================================
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    };

    const isOverdue = (dateString) => {
        if (!dateString) return false;
        const dueDate = new Date(dateString + 'T23:59:59');
        const today = new Date();
        return dueDate < today;
    };

    const isDueSoon = (dateString) => {
        if (!dateString) return false;
        const dueDate = new Date(dateString + 'T23:59:59');
        const today = new Date();
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 2 && diffDays >= 0;
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#22c55e';
            default: return '#64748b';
        }
    };

    const getPriorityLabel = (priority) => {
        switch (priority) {
            case 'high': return 'Alta';
            case 'medium': return 'Média';
            case 'low': return 'Baixa';
            default: return 'Média';
        }
    };

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
        
        if (currentProjectTitle) {
            currentProjectTitle.textContent = activeProject ? activeProject.name : "Selecione um Projeto";
        }
        
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
            column.innerHTML = `
                <h3>${status} <span class="task-count">(${statusCount})</span></h3>
                <div class="tasks-container"></div>
            `;
            
            const tasksContainer = column.querySelector('.tasks-container');
            tasks.filter(t => t.status === status).forEach(task => {
                tasksContainer.appendChild(createTaskCard(task));
            });
            kanbanBoard.appendChild(column);
        });
    };

    const createTaskCard = (task) => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.dataset.taskId = task.id;
        card.draggable = true;
        
        // Determinar classes baseadas na prioridade e data de vencimento
        let cardClasses = ['task-card'];
        let priorityIndicator = '';
        let dueDateIndicator = '';
        
        // Indicador de prioridade
        const priorityColor = getPriorityColor(task.priority);
        priorityIndicator = `<div class="priority-indicator" style="background-color: ${priorityColor}"></div>`;
        
        // Indicador de data de vencimento
        if (task.due_date) {
            let dueDateClass = '';
            let dueDateIcon = '📅';
            
            if (isOverdue(task.due_date)) {
                dueDateClass = 'overdue';
                dueDateIcon = '⚠️';
                cardClasses.push('overdue-task');
            } else if (isDueSoon(task.due_date)) {
                dueDateClass = 'due-soon';
                dueDateIcon = '⏰';
                cardClasses.push('due-soon-task');
            }
            
            dueDateIndicator = `
                <div class="due-date ${dueDateClass}">
                    <span>${dueDateIcon}</span>
                    <span>${formatDate(task.due_date)}</span>
                </div>
            `;
        }
        
        card.className = cardClasses.join(' ');
        card.innerHTML = `
            ${priorityIndicator}
            <div class="task-content">
                <div class="task-text" ${editingTaskId === task.id ? 'contenteditable="true"' : ''}>${task.text}</div>
                <div class="task-meta">
                    <span class="priority-badge" style="background-color: ${priorityColor}">
                        ${getPriorityLabel(task.priority)}
                    </span>
                    ${dueDateIndicator}
                </div>
            </div>
            <div class="task-actions">
                <button class="edit-btn" onclick="editTask(${task.id})" title="Editar">✏️</button>
                <button class="delete-btn" onclick="deleteTask(${task.id})" title="Excluir">🗑️</button>
            </div>
        `;
        
        return card;
    };

    // ==================================================================
    // --- FUNÇÕES DE EDIÇÃO DE TAREFAS ---
    // ==================================================================
    window.editTask = async (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
            // Fechar modal ao clicar fora
    modal.addEventListener('mousedown', e => {
        if (e.target === modal) closeEditModal();
    });

        
        // Criar modal de edição
        const modal = document.createElement('div');
        modal.className = 'task-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Editar Tarefa</h3>
                    <button class="close-modal" onclick="closeEditModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="edit-task-text">Texto da Tarefa</label>
                        <input type="text" id="edit-task-text" value="${task.text}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-task-date">Data de Vencimento</label>
                        <input type="date" id="edit-task-date" value="${task.due_date || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-task-priority">Prioridade</label>
                        <select id="edit-task-priority">
                            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Baixa</option>
                            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Média</option>
                            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Alta</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="edit-task-status">Status</label>
                        <select id="edit-task-status">
                            <option value="A Fazer" ${task.status === 'A Fazer' ? 'selected' : ''}>A Fazer</option>
                            <option value="Em Andamento" ${task.status === 'Em Andamento' ? 'selected' : ''}>Em Andamento</option>
                            <option value="Concluído" ${task.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn" onclick="closeEditModal()">Cancelar</button>
                    <button class="save-btn" onclick="saveTask(${taskId})">Salvar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.getElementById('edit-task-text').focus();
    };

    window.saveTask = async (taskId) => {
        const text = document.getElementById('edit-task-text').value.trim();
        const due_date = document.getElementById('edit-task-date').value || null;
        const priority = document.getElementById('edit-task-priority').value;
        const status = document.getElementById('edit-task-status').value;
        
        if (!text) {
            showNotification('O texto da tarefa é obrigatório.', 'error');
            return;
        }
        
        const { error } = await _supabase.from('tasks').update({
            text,
            due_date,
            priority,
            status
        }).eq('id', taskId);
        
        if (error) {
            console.error('Erro ao atualizar tarefa:', error);
            showNotification('Erro ao atualizar tarefa.', 'error');
        } else {
            showNotification('Tarefa atualizada com sucesso!', 'success');
            await loadTasks(activeProjectId);
            renderAll();
            closeEditModal();
        }
    };

    window.deleteTask = async (taskId) => {
        if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
        
        const { error } = await _supabase.from('tasks').delete().eq('id', taskId);
        
        if (error) {
            console.error('Erro ao excluir tarefa:', error);
            showNotification('Erro ao excluir tarefa.', 'error');
        } else {
            showNotification('Tarefa excluída com sucesso!', 'success');
            await loadTasks(activeProjectId);
            renderAll();
        }
    };

    window.closeEditModal = () => {
        const modal = document.querySelector('.task-modal');
        if (modal) modal.remove();
    };

    // --- Navegação entre views ---
    if (mainNav) {
        mainNav.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.dataset.view) {
                e.preventDefault();
                switchView(link.dataset.view);
            }
        });
    }

    const switchView = (viewName) => {
        mainViews.forEach(view => view.classList.add('view-hidden'));
        const viewToShow = document.getElementById(`view-${viewName}`);
        if (viewToShow) {
            viewToShow.classList.remove('view-hidden');
        }
        
        mainNav.querySelectorAll('.nav-item').forEach(li => li.classList.remove('active'));
        const activeLink = mainNav.querySelector(`a[data-view="${viewName}"]`);
        if (activeLink) {
            activeLink.closest('.nav-item').classList.add('active');
        }
    };

    // ==================================================================
    // --- EVENT LISTENERS DA APLICAÇÃO ---
    // ==================================================================
    if (projectForm) {
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = projectInput.value.trim();
            if (name && user) {
                const { data, error } = await _supabase.from('projects').insert([{ name, user_id: user.id }]).select();
                if (error) {
                    console.error('Erro ao criar projeto:', error);
                    showNotification('Erro ao criar projeto.', 'error');
                } else {
                    projectInput.value = '';
                    await loadProjects();
                    if (data && data[0]) {
                        activeProjectId = data.id;
                        await loadTasks(activeProjectId);
                    }
                    renderAll();
                }
            }
        });
    }

    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = taskForm.querySelector('#task-input').value.trim();
            const due_date = taskForm.querySelector('#task-due-date').value;
            const priority = taskForm.querySelector('#task-priority').value;
            
            if (text && activeProjectId && user) {
                const { error } = await _supabase.from('tasks').insert([
                    {
                        text,
                        due_date: due_date || null,
                        priority,
                        status: 'A Fazer',
                        project_id: activeProjectId,
                        user_id: user.id
                    }
                ]);
                if (error) {
                    console.error('Erro ao criar tarefa:', error);
                    showNotification('Erro ao criar tarefa.', 'error');
                } else {
                    taskForm.reset();
                    showNotification('Tarefa adicionada com sucesso!', 'success');
                    await loadTasks(activeProjectId);
                    renderAll();
                }
            }
        });
    }

    // --- Drag and Drop das tarefas ---
    let draggedTaskId = null;
    if (kanbanBoard) {
        kanbanBoard.addEventListener('dragstart', e => {
            if (e.target.classList.contains('task-card')) {
                draggedTaskId = e.target.dataset.taskId;
                e.target.classList.add('dragging');
            }
        });
        
        kanbanBoard.addEventListener('dragend', e => {
            if (e.target.classList.contains('task-card')) {
                e.target.classList.remove('dragging');
            }
        });
        
        kanbanBoard.addEventListener('dragover', e => { 
            e.preventDefault(); 
        });
        
        kanbanBoard.addEventListener('drop', async (e) => {
            e.preventDefault();
            const column = e.target.closest('.kanban-column');
            if (column && draggedTaskId) {
                const newStatus = column.dataset.status;
                const { error } = await _supabase.from('tasks').update({ status: newStatus }).eq('id', draggedTaskId);
                if (error) {
                    console.error('Erro ao mover tarefa:', error);
                    showNotification('Erro ao mover tarefa.', 'error');
                } else {
                    const movedTask = tasks.find(t => t.id == draggedTaskId);
                    if (movedTask) movedTask.status = newStatus;
                    showNotification(`Tarefa movida para ${newStatus}!`, 'success');
                    renderAll();
                }
            }
        });
    }

    // --- Notificações (toast) ---
    const showNotification = (message, type = 'success') => {
        if (!notificationContainer) return;
        
        const notification = document.createElement('div');
        notification.className = `toast ${type}`;
        notification.textContent = message;
        notificationContainer.appendChild(notification);
        setTimeout(() => notification.remove(), 3500);
    };
});
