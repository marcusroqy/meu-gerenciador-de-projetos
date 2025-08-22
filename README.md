# 🚀 Meu Gerenciador de Projetos

Um gerenciador de projetos e tarefas no estilo Kanban, construído com HTML, CSS e JavaScript puros, com o objetivo de criar uma experiência de usuário moderna e funcional.
Um gerenciador de projetos e tarefas completo, no estilo Kanban, construído do zero com **HTML, CSS e JavaScript puro**, integrado a um backend **Supabase** para autenticação e persistência de dados em tempo real.

![Status do Projeto](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)

---
## ✨ Funcionalidades Implementadas

### ✨ Funcionalidades Implementadas
* **Autenticação de Usuários:** Sistema completo de login e cadastro com e-mail e senha, gerenciado pelo Supabase Auth.
* **Gerenciamento de Projetos:** Crie e gerencie múltiplos projetos. Os dados são salvos por usuário.
* **Quadro Kanban Interativo:** Organize tarefas nas colunas "A Fazer", "Em Andamento" e "Concluído".
* **Arrastar e Soltar (Drag and Drop):** Mova tarefas entre as colunas de forma fluida e intuitiva para atualizar seu status.
* **Detalhes da Tarefa:** Clique em uma tarefa para abrir um modal e editar título, prioridade, data de vencimento, descrição e adicionar comentários.
* **Dashboard de Métricas:** Visualize estatísticas agregadas de todos os seus projetos, com um gráfico mostrando a distribuição de tarefas por status.
* **Persistência de Dados Real-time:** Todas as informações (projetos, tarefas, usuários) são salvas em um banco de dados PostgreSQL via Supabase.
* **Tema Claro/Escuro:** Alterne entre os modos de visualização para maior conforto visual. A preferência é salva no navegador.
* **Design Responsivo:** A interface se adapta para uma experiência de uso agradável em desktops e dispositivos móveis.

- **Gerenciamento de Projetos:** Crie e gerencie múltiplos projetos.
- **Quadro Kanban:** Organize tarefas nas colunas "A Fazer", "Em Andamento" e "Concluído".
- **Arrastar e Soltar (Drag and Drop):** Mova tarefas entre as colunas de forma interativa.
- **Detalhes da Tarefa:** Clique em uma tarefa para ver detalhes, data de vencimento e adicionar comentários.
- **Data de Vencimento Editável:** Altere a data de vencimento diretamente no modal de detalhes.
- **Dashboard Geral:** Visualize estatísticas agregadas de todos os projetos.
- **Configurações de Perfil:** Altere nome, usuário, email e foto de perfil.
- **Persistência de Dados:** Todas as informações são salvas localmente no navegador (`localStorage`).
- **Tema Claro/Escuro:** Alterne entre os modos de visualização.
- **Caixa de Entrada (Em implementação):** Funcionalidade para receber e visualizar emails.
## 🛠️ Tecnologias Utilizadas

### 🛠️ Tecnologias Utilizadas
A aplicação foi construída utilizando tecnologias modernas, sem o uso de frameworks de frontend, para demonstrar um domínio profundo dos fundamentos da web.

- **Frontend:** HTML5, CSS3 (com Variáveis), JavaScript (ES6+)
- **Bibliotecas:** Chart.js para os gráficos.
- **Ícones:** Google Material Symbols.
- **Hospedagem:** Vercel.
* **Frontend:**
    * **HTML5** (Estrutura semântica)
    * **CSS3** (Variáveis CSS para theming, Flexbox para layout)
    * **JavaScript (ES6+)** (Lógica da aplicação, manipulação do DOM, reatividade)

### 📷 Screenshots
* **Backend & Infraestrutura:**
    * **Supabase:** Plataforma open-source que provê:
        * **Autenticação:** Gerenciamento de usuários.
        * **Banco de Dados:** PostgreSQL para persistência dos dados.
        * **APIs:** APIs geradas automaticamente para interação com o banco de dados.
    * **Vercel:** Plataforma de hospedagem para deploy contínuo.

*Exemplo:*
* **Bibliotecas e Ferramentas:**
    * **Chart.js:** Para a criação dos gráficos no dashboard.
    * **Google Material Symbols:** Para os ícones da interface.

## 📸 Screenshots

*(Adicione aqui screenshots da sua aplicação, como a visão do Kanban, o Dashboard, o modal de edição, etc.)*

**Exemplo:** Visão do Kanban
![Visão do Kanban](URL_DA_SUA_IMAGEM_AQUI)

### 🔗 Deploy
## 🔗 Deploy

Acesse a versão ao vivo do projeto aqui:
* **[Link para o App](https://meu-gerenciador-de-projetos.vercel.app)**

### ⚙️ Como Rodar o Projeto Localmente
* **[Link para a Aplicação](SEU_LINK_DO_VERCEL_AQUI)**

## ⚙️ Como Rodar o Projeto Localmente

Para rodar este projeto no seu ambiente local, siga os passos abaixo:

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/marcusrogy/meu-gerenciador-de-projetos.git](https://github.com/marcusrogy/meu-gerenciador-de-projetos.git)
    cd meu-gerenciador-de-projetos
    ```

2.  **Crie um projeto no Supabase:**
    * Vá para [supabase.com](https://supabase.com/), crie uma conta e um novo projeto.
    * Dentro do seu projeto Supabase, use o **SQL Editor** para criar as tabelas `projects` e `tasks` (você pode exportar a estrutura do seu projeto atual).
    * Vá para **Project Settings > API**.

3.  **Configure as Chaves de API:**
    * No código, localize os arquivos `index.html` e `login.html`.
    * Encontre as variáveis `supabaseUrl` e `supabaseKey` no script e substitua os valores pelas chaves do **seu** projeto Supabase.

1. Clone o repositório:
   ```bash
   git clone [https://github.com/marcusrogy/meu-gerenciador-de-projetos.git](https://github.com/marcusrogy/meu-gerenciador-de-projetos.git)
4.  **Abra o `login.html` no seu navegador:**
    * Você pode usar uma extensão como o **Live Server** no VS Code para iniciar um servidor local e visualizar o projeto.
