document.addEventListener('DOMContentLoaded', () => {

    // ==================================================================
    // --- 1. CONFIGURAÇÃO DO SUPABASE ---
    // ==================================================================
    // IMPORTANTE: Substitua pelas suas credenciais do Supabase!
    // Você encontra isso em: Settings > API no seu painel do Supabase.
    const SUPABASE_URL = 'https://egishguoptqbxmsnhngf.supabase.co'; 
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnaXNoZ3VvcHRxYnhtc25obmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NDMzODksImV4cCI6MjA3MTIxOTM4OX0.RmbvPa2h5Jl33A1LetqufGw7kuGPJZKouT0VEp2icxw';

    // Se você configurou na Vercel, o código seria assim:
    // const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'COLE_SUA_SUPABASE_URL_AQUI') {
        console.error("As credenciais do Supabase não foram configuradas. Verifique o arquivo script.js");
        alert("Erro de configuração: As credenciais do Supabase não foram definidas. Verifique o console para mais detalhes.");
        return;
    }

    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ==================================================================
    // --- 2. SELEÇÃO DOS ELEMENTOS DO HTML (DOM) ---
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
    const userAvatar = document.querySelector('.user-avatar');
    const userEmailSpan = document.querySelector('.sidebar-header span');

    const notificationContainer = document.getElementById('notification-container');

    // ==================================================================
    // --- 3. FUNÇÕES DE LÓGICA E UI ---
    // ==================================================================

    /**
     * Mostra uma notificação (toast) na tela.
     * @param {string} message - A mensagem a ser exibida.
     * @param {string} type - 'success' ou 'error'.
     */
    const showNotification = (message, type = 'success') => {
        const notification = document.createElement('div');
        notification.className = `toast ${type}`;
        notification.textContent = message;
        notificationContainer.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    };

    /**
     * Alterna a visibilidade entre o formulário de login e o de cadastro.
     * ESTA É A FUNÇÃO QUE CORRIGE O SEU PROBLEMA.
     */
    const toggleAuthForms = () => {
        loginFormContainer.classList.toggle('view-hidden');
        registerFormContainer.classList.toggle('view-hidden');
    };

    /**
     * Atualiza a interface com base no estado de login do usuário.
     * @param {object|null} user - O objeto do usuário do Supabase ou null.
     */
    const updateUserInterface = (user) => {
        if (user) {
            // Usuário está logado: mostra o app, esconde a tela de login
            authView.classList.add('view-hidden');
            appView.classList.remove('view-hidden');
            
            // Atualiza o email e o avatar na barra lateral
            if (user.email) {
                userEmailSpan.textContent = user.email;
                userAvatar.textContent = user.email.charAt(0).toUpperCase();
            }
        } else {
            // Usuário não está logado: mostra a tela de login, esconde o app
            authView.classList.remove('view-hidden');
            appView.classList.add('view-hidden');
        }
    };

    // ==================================================================
    // --- 4. EVENT LISTENERS (OUVINTES DE EVENTOS) ---
    // ==================================================================

    // Listener para o link "Cadastre-se"
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault(); // Impede que o link mude a URL
        toggleAuthForms();
    });

    // Listener para o link "Faça Login"
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault(); // Impede que o link mude a URL
        toggleAuthForms();
    });

    // Listener para o formulário de REGISTRO
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            showNotification(`Erro ao criar conta: ${error.message}`, 'error');
        } else {
            showNotification('Conta criada com sucesso! Verifique seu email para confirmação.', 'success');
            // Opcional: volta para a tela de login após o registro
            toggleAuthForms(); 
        }
    });

    // Listener para o formulário de LOGIN
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            showNotification(`Erro no login: ${error.message}`, 'error');
        } 
        // Não é preciso fazer nada no 'else', o onAuthStateChange vai cuidar disso.
    });

    // Listener para o botão de SAIR (Logout)
    signOutBtn.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            showNotification(`Erro ao sair: ${error.message}`, 'error');
        }
        // O onAuthStateChange vai cuidar de atualizar a UI.
    });


    // ==================================================================
    // --- 5. VERIFICAÇÃO INICIAL E ESTADO DE AUTENTICAÇÃO ---
    // ==================================================================

    // Ouve mudanças no estado de autenticação (login, logout)
    supabase.auth.onAuthStateChange((_event, session) => {
        const user = session?.user;
        updateUserInterface(user);
    });

    // Verifica se já existe uma sessão ativa quando a página carrega
    const checkInitialSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        updateUserInterface(user);
    };

    // Roda a verificação inicial
    checkInitialSession();

});
