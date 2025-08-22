# 📧 Configuração da Integração Gmail

Para conectar seu Gmail real ao sistema, você precisa configurar as credenciais da Google API. Siga os passos abaixo:

## 🔑 1. Criar Projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **Gmail API**:
   - Vá em "APIs & Services" > "Library"
   - Procure por "Gmail API"
   - Clique em "Enable"

## 🔐 2. Configurar OAuth2

1. Vá em "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure:
   - **Application Type**: Web application
   - **Name**: Meu Gerenciador de Projetos
   - **Authorized JavaScript origins**: 
     - `http://localhost` (para teste local)
     - `file://` (para arquivo local)
     - Seu domínio se for hospedar online
   - **Authorized redirect URIs**: Same as origins

## 🔧 3. Configurar as Credenciais

1. Após criar, copie o **Client ID**
2. Crie uma **API Key**:
   - "Create Credentials" > "API Key"
   - Copie a chave gerada

## 📝 4. Atualizar o Código

Abra o arquivo `script.js` e substitua as credenciais de exemplo:

```javascript
const gmailConfig = {
  clientId: 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com',
  apiKey: 'SUA_API_KEY_AQUI',
  discoveryDoc: 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest',
  scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send'
};
```

## 🚀 5. Testar a Integração

1. Abra o arquivo `index.html` no navegador
2. Navegue para a seção "Email"
3. Clique em "Conectar Gmail"
4. Faça login com sua conta Google
5. Autorize as permissões necessárias

## 🔒 Segurança

- ✅ **OAuth2**: Autenticação segura do Google
- ✅ **Permissões limitadas**: Apenas leitura e envio de emails
- ✅ **Tokens temporários**: Acesso limitado no tempo
- ✅ **Dados locais**: Credenciais salvas apenas no seu navegador

## ❓ Troubleshooting

### Erro "API not enabled"
- Verifique se a Gmail API está ativada no projeto

### Erro "Origin not allowed"
- Adicione seu domínio/URL nas origens autorizadas

### Erro "Invalid client"
- Verifique se o Client ID está correto no código

### Erro de CORS
- Para testes locais, use um servidor HTTP simples ao invés de abrir o arquivo diretamente

## 📞 Suporte

Se precisar de ajuda com a configuração, envie as informações do erro que está recebendo.

---

**Importante**: Mantenha suas credenciais seguras e nunca as compartilhe publicamente!
