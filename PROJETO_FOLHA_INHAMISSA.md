
# PROJETO FOLHA DE INHAMISSA

## 📋 INFORMAÇÃO BÁSICA

**Nome do Projeto:** Folha de Inhamissa - Plataforma Digital Educativa  
**Tipo:** Sistema Web de Informação e Educação  
**Localização:** Inhamissa, Moçambique  
**Data de Criação:** 2025  

---

## 🎯 OBJETIVO DO PROJETO

Criar uma plataforma digital que ajuda estudantes e professores a:
- Partilhar informações educativas
- Publicar notícias da escola
- Fazer testes e quizzes online
- Consultar horários de aulas
- Interagir através de comentários e curtidas

---

## 👥 UTILIZADORES DO SISTEMA

### Administradores
Pessoas que controlam o sistema:
- jeanabilio72@gmail.com
- killiandesigner@gmail.com
- ianomachai@gmail.com

**Permissões:** Podem publicar notícias e quizzes, gerir conteúdos

### Utilizadores Comuns
Qualquer pessoa registada pode:
- Ver notícias e quizzes
- Fazer publicações no feed
- Comentar e curtir conteúdos
- Consultar horários

---

## 🛠️ FUNCIONALIDADES PRINCIPAIS

### 1. Sistema de Autenticação
- **Registo de novos utilizadores**
- **Login com email e senha**
- **Recuperação de senha**
- **Controlo de acesso por tipo de utilizador**

### 2. Feed de Publicações (Home)
- Utilizadores podem criar publicações
- Sistema de curtidas
- Sistema de comentários
- Contador de visualizações

### 3. Notícias
- Apenas administradores publicam
- Inclui título, descrição e imagem
- Visível para todos os visitantes

### 4. Quizzes Educativos
- Apenas administradores criam
- Perguntas de múltipla escolha
- Sistema de pontuação automática
- Feedback imediato

### 5. Horários de Aulas
- Visualização de horários escolares
- Organizado por turma e período

### 6. Painel Administrativo
- Estatísticas de uso
- Gestão de conteúdos
- Controlo de utilizadores

---

## 🔒 SEGURANÇA

### Regras de Acesso ao Firebase

**Publicações (Posts):**
- Qualquer utilizador autenticado pode criar
- Apenas o autor pode apagar
- Todos podem curtir e comentar

**Notícias:**
- Apenas administradores criam/editam
- Qualquer pessoa pode ler

**Quizzes:**
- Apenas administradores criam/editam
- Utilizadores autenticados fazem os testes

**Dados de Utilizadores:**
- Cada um só edita seus próprios dados
- Todos podem ver perfis públicos

---

## 💾 ESTRUTURA DE DADOS

### Coleção: Users (Utilizadores)
```
- userId (ID único)
- name (Nome completo)
- email (Email)
- photoURL (Foto de perfil)
- createdAt (Data de registo)
```

### Coleção: Posts (Publicações)
```
- postId (ID único)
- authorId (ID do autor)
- authorName (Nome do autor)
- content (Conteúdo da publicação)
- imageUrl (URL da imagem, opcional)
- likes (Número de curtidas)
- likedBy (Lista de quem curtiu)
- comments (Array de comentários)
- views (Número de visualizações)
- timestamp (Data/hora)
```

### Coleção: News (Notícias)
```
- newsId (ID único)
- authorId (ID do administrador)
- authorName (Nome do administrador)
- title (Título da notícia)
- content (Conteúdo)
- imageUrl (Imagem de capa)
- timestamp (Data/hora)
```

### Coleção: Quizzes
```
- quizId (ID único)
- authorId (ID do administrador)
- title (Título do quiz)
- description (Descrição)
- questions (Array de perguntas)
  - question (Texto da pergunta)
  - options (Opções de resposta)
  - correct (Resposta correta)
- timestamp (Data/hora)
```

---

## 📊 SISTEMA DE UPLOAD DE IMAGENS

O sistema usa dois métodos para garantir que as imagens sejam sempre carregadas:

### Método 1: ImgBB (Principal)
- Serviço externo rápido
- Não precisa de configuração Firebase
- Usado primeiro

### Método 2: Firebase Storage (Backup)
- Se ImgBB falhar, usa Firebase
- 100% confiável
- Integrado com o sistema

---

## 🎨 CARACTERÍSTICAS TÉCNICAS

### Tecnologias Utilizadas
- **Frontend:** HTML5, CSS3, JavaScript
- **Backend:** Firebase (Firestore Database)
- **Autenticação:** Firebase Authentication
- **Armazenamento:** Firebase Storage + ImgBB API
- **Hospedagem:** Servidor HTTP Python

### Módulos Externos
- `interactivity.js` - Sistema de curtidas e comentários
- `upload-utils.js` - Sistema de upload de imagens

---

## 📱 PÁGINAS DO SISTEMA

1. **index.html** - Página inicial/splash
2. **login.html** - Página de login
3. **registar.html** - Registo de novos utilizadores
4. **recuperar-senha.html** - Recuperação de senha
5. **home.html** - Feed de publicações
6. **noticias.html** - Visualização de notícias
7. **aprenda.html** - Área de quizzes
8. **horarios.html** - Horários de aulas
9. **admin.html** - Painel administrativo
10. **submit-news.html** - Formulário de criação de notícias
11. **submit-quiz.html** - Formulário de criação de quizzes

---

## 🚀 COMO FUNCIONA

### Fluxo de Utilizador Comum:
1. Regista-se ou faz login
2. Acede ao feed (home)
3. Vê publicações, notícias e quizzes
4. Pode criar suas próprias publicações
5. Curte e comenta conteúdos
6. Consulta horários quando necessário

### Fluxo de Administrador:
1. Faz login com conta administrativa
2. Acede ao painel admin
3. Cria notícias e quizzes
4. Vê estatísticas de uso
5. Gere conteúdos da plataforma

---

## 📈 ESTATÍSTICAS REGISTADAS

O sistema regista automaticamente:
- Número de visitas por página
- Tempo de permanência
- Dispositivo utilizado (mobile/desktop)
- Data e hora de acesso
- Utilizador (se autenticado)

---

## 🔧 MANUTENÇÃO E ATUALIZAÇÕES

### Próximas Melhorias Planeadas:
- Sistema de notificações em tempo real
- Chat entre utilizadores
- Modo offline
- App móvel nativa
- Sistema de badges/conquistas

---

## 📞 SUPORTE TÉCNICO

Para problemas ou dúvidas:
- Contactar administradores do sistema
- Email: jeanabilio72@gmail.com
- Email alternativo: killiandesigner@gmail.com

---

## 📝 NOTAS IMPORTANTES

1. **Internet Necessária:** O sistema precisa de conexão à internet para funcionar
2. **Navegadores Compatíveis:** Chrome, Firefox, Safari, Edge (versões recentes)
3. **Dispositivos:** Funciona em computadores e telemóveis
4. **Segurança:** Nunca partilhe suas credenciais de login

---

**Documento criado em:** 05 de Outubro de 2025  
**Última atualização:** Sistema em desenvolvimento ativo  
**Versão:** 1.0
