document.addEventListener('DOMContentLoaded', () => {
  // Estado
  let projects = [{id:'1', name:'Primeiro Projeto'}, {id:'2', name:'Exemplo'}];
  let tasks = [
    {id:'t1',projectId:'1',text:'Minha primeira tarefa',status:'A Fazer',
     priority:'Média',comments:[],createdAt:getNowISO(), dueDate:"", desc:""}
  ];
  let activeProjectId = projects[0].id;
  let user = {name:"Usuário", avatar:""};

  // Sidebar, navegação e projetos iguais
  document.getElementById('projects-toggle').onclick = (e)=>{
    e.preventDefault();
    document.getElementById('projects-cascade').classList.toggle('view-hidden');
    document.getElementById('arrow-projects').classList.toggle('opened');
  };
  document.querySelectorAll('.main-nav .nav-item > a[data-view]').forEach(link => {
    link.onclick = e => {
      e.preventDefault();
      document.querySelectorAll('.main-nav .nav-item').forEach(l=>l.classList.remove('active'));
      link.parentElement.classList.add('active');
      document.querySelectorAll('.main-view').forEach(v=>v.classList.add('view-hidden'));
      document.getElementById('view-'+link.dataset.view).classList.remove('view-hidden');
      if(link.dataset.view==="dashboard") renderDashboard();
    };
  });

  // Avatar/nome (edição só nas configs)
  function updateUserHeader() {
    const avatarEl = document.getElementById('user-avatar');
    avatarEl.textContent=user.name[0];
    avatarEl.style.backgroundImage=user.avatar?`url('${user.avatar}')`:"";
    avatarEl.style.backgroundSize=user.avatar?"cover":"";
    document.getElementById('user-name').textContent=user.name;
  }
  updateUserHeader();
  document.getElementById('user-settings-form').onsubmit = function(e){
    e.preventDefault();
    user.name = document.getElementById('profile-name').value || "Usuário";
    user.avatar = document.getElementById("profile-avatar-img").getAttribute("src") || "";
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

  function renderProjects() {
    const projectList = document.getElementById('project-list');
    projectList.innerHTML = '';
    projects.forEach(project => {
      const li = document.createElement('li');
      li.textContent = project.name;
      li.className = project.id === activeProjectId ? 'active-project' : '';
      li.onclick = ()=> { selectProject(project.id);}
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
  renderProjects(); selectProject(activeProjectId);

  document.getElementById('project-form').onsubmit = function(e){
    e.preventDefault();
    const name = document.getElementById('project-input').value.trim();
    if(!name) return;
    const id = Date.now()+"";
    projects.unshift({id,name});
    renderProjects();
    selectProject(id);
    document.getElementById('project-input').value="";
  };

  // Util
  function getNowISO() {
    const now = new Date();
    const tz = now.getTimezoneOffset() * 60000;
    return new Date(now - tz).toISOString().slice(0,16);
  }
  function corPriority(priority){
    if(priority==='Baixa')return "task-priority-low";
    if(priority==='Média'||priority==='medium')return "task-priority-média";
    if(priority==='Alta'||priority==='high')return "task-priority-high";
    return "task-priority-média";
  }

  // Kanban centralizado
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
        const dateInfo = task.dueDate ? `<span>Vence: ${task.dueDate.split('-').reverse().join('/')}</span>` : '';
        const createdInfo = task.createdAt ? `<span>Criada: ${task.createdAt.replace('T',' ').slice(0,16)}</span>` : '';
        const card=document.createElement('div');
        card.className='task-card'; card.setAttribute('draggable','true'); card.dataset.taskId=task.id;
        card.innerHTML=`
          <div class="task-title">
            <span class="task-priority-indicator ${corPriority(task.priority)}"></span>
            ${task.text}
            <span class="task-priority-label">${task.priority}</span>
          </div>
          <div class="task-meta">
            ${createdInfo}${dateInfo?" • "+dateInfo:""}
          </div>
          <div class="task-actions">
            <button title="Editar" onclick="window.editTask('${task.id}')"><span class="material-symbols-outlined">edit</span></button>
          </div>`;
        tc.appendChild(card);
      });
      kanbanBoard.appendChild(col);
    });
    // Drag and drop igual ao anterior...
    let dragTaskId = null;
    document.querySelectorAll('.task-card').forEach(card=>{
      card.ondragstart = (e)=>{ dragTaskId = card.dataset.taskId; setTimeout(()=>card.classList.add('dragging'),1);}
      card.ondragend = (e)=>{ dragTaskId = null; card.classList.remove('dragging'); dndClear();}
    });
    function dndClear(){
      document.querySelectorAll('.kanban-column').forEach(c=>c.classList.remove('drag-hover'));
    }
    document.querySelectorAll('.kanban-column').forEach(col=>{
      col.ondragover = (e)=>{e.preventDefault();dndClear();col.classList.add('drag-hover');};
      col.ondragleave = dndClear;
      col.ondrop = function(e){
        e.preventDefault();
        if(!dragTaskId) return;
        const status = col.dataset.status;
        const task = tasks.find(t=>t.id===dragTaskId);
        if(task && task.status!==status){
          task.status = status;
          renderTasks();
        }
        dndClear();
      };
    });
    document.getElementById('task-counter').textContent = tasks.filter(t=>t.projectId===activeProjectId&&t.status!=='Concluído').length+" tarefas pendentes.";
  }

  document.getElementById('task-form').onsubmit = function(e){
    e.preventDefault();
    const text = document.getElementById('task-input').value.trim();
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value;
    if(!text||!activeProjectId) return;
    tasks.push({ id:Date.now()+"",projectId:activeProjectId,text,status:'A Fazer',priority,comments:[],createdAt:getNowISO(),dueDate:dueDate||"",desc:"" });
    document.getElementById('task-input').value="";
    document.getElementById('task-due-date').value="";
    renderTasks();
  };

  // MODAL EDIÇÃO + COMENTÁRIOS
  window.editTask = (taskId) => {
    const task = tasks.find(t=>t.id===taskId);
    if(!task) return;
    const modal = document.createElement('div');
    modal.className="task-edit-modal";
    modal.innerHTML = `
      <div class="modal-content">
        <label>Nome:</label>
        <input id="modal-task-text" value="${task.text}"/>
        <label>Prioridade:</label>
        <select id="modal-task-priority">
          <option value="Baixa" ${task.priority==='Baixa'?'selected':''}>Baixa</option>
          <option value="Média" ${task.priority==='Média'?'selected':''}>Média</option>
          <option value="Alta" ${task.priority==='Alta'?'selected':''}>Alta</option>
        </select>
        <label>Vencimento:</label>
        <input id="modal-task-duedate" type="date" value="${task.dueDate||''}"/>
        <label>Observação:</label>
        <textarea id="modal-task-desc" placeholder="Descrição extra">${task.desc||''}</textarea>
        <label>Comentários:</label>
        <div class="comment-list">${task.comments&&task.comments.length?
        task.comments.map(c=>`<div class="comment-row"><span class="comment-author">Comentário:</span>${c}</div>`).join('')
        :'<div style="color:#888;">Sem comentários.</div>'}</div>
        <form id="modal-comment-form">
          <textarea id="comment-text" rows="2" placeholder="Adicionar comentário..."></textarea>
          <div class="actions">
            <button type="submit">Salvar</button>
            <button type="button" onclick="this.closest('.task-edit-modal').remove()">Cancelar</button>
          </div>
        </form>
      </div>`;
    modal.querySelector('#modal-comment-form').onsubmit = e => {
      e.preventDefault();
      const txt = modal.querySelector('#comment-text').value.trim();
      if(txt){ task.comments = task.comments||[]; task.comments.push(txt); }
      task.text = modal.querySelector('#modal-task-text').value;
      task.priority = modal.querySelector('#modal-task-priority').value;
      task.dueDate = modal.querySelector('#modal-task-duedate').value;
      task.desc = modal.querySelector('#modal-task-desc').value;
      modal.remove();
      renderTasks();
    };
    document.body.appendChild(modal);
  };

  // --- Dashboard Premium: gráfico funcional ---
  function renderDashboard() {
    // Cards
    document.getElementById('stat-projects').textContent = projects.length;
    document.getElementById('stat-tasks-done').textContent = tasks.filter(x=>x.status==='Concluído').length;
    document.getElementById('stat-tasks-todo').textContent = tasks.filter(x=>x.status!=='Concluído').length;
    // Hoje
    const hoje = (new Date()).toISOString().slice(0,10);
    document.getElementById('stat-today').textContent = tasks.filter(x=>(x.createdAt||'').slice(0,10)===hoje).length;

    // Pie Chart.js
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

  // --- Modo escuro/claro automático (que respeita sistema, Ctrl+J alterna) ---
  function preferDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function applyInitialTheme() {
    if(localStorage.getItem("darkModeEnabled")==='true' || (!localStorage.getItem("darkModeEnabled")&&preferDark()))
      document.body.classList.add("dark-mode");
    else
      document.body.classList.remove("dark-mode");
  }
  applyInitialTheme();
  document.addEventListener("keydown",e=>{
    if(e.ctrlKey && (e.key==="j"||e.key==="J")) {
      document.body.classList.toggle("dark-mode");
      localStorage.setItem("darkModeEnabled",document.body.classList.contains("dark-mode"));
      e.preventDefault();
    }
  });

  // Render inicial
  renderTasks();
});
