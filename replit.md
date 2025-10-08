# Portal 04 de Outubro - Folha de Inhamissa

## Overview
Portal 04 de Outubro is a school portal web application for "Folha de Inhamissa" school. This is a static web application that provides social networking features for students and staff, including:

- User authentication (login/registration)
- Social feed with posts, images, and videos
- User profiles with class and schedule information
- News section
- Learning resources (Aprenda)
- Class schedules (Horários)
- Search functionality

## Technology Stack

### Frontend
- **Pure HTML/CSS/JavaScript** - No build process required
- **Firebase** - Backend as a Service
  - Firebase Authentication for user management
  - Cloud Firestore for database
  - Cloud Storage for media files
- **Font Awesome** - Icons
- **Google Fonts** (Inter) - Typography

### Server
- **Python HTTP Server** - Simple static file server for development and deployment

## Project Structure

```
.
├── index.html              # Main feed page
├── login.html              # Login page
├── registar.html           # Registration page
├── recuperar-senha.html    # Password recovery
├── aprenda.html            # Learning resources
├── horarios.html           # Class schedules
├── noticias.html           # News section
├── publicarnews.html       # Publish news
├── teste.html              # Test page
├── 404.html                # Error page
└── .gitignore              # Git ignore rules
```

## Firebase Configuration

The application is configured to use Firebase with the following setup:
- **Project ID**: luna-bot-70962
- **Auth Domain**: luna-bot-70962.firebaseapp.com
- **Storage Bucket**: luna-bot-70962.appspot.com

**Note**: Firebase credentials are embedded in the HTML files. For production use, consider implementing proper environment variable management.

## Development

### Running Locally
The application uses Python's built-in HTTP server to serve static files:
```bash
python -m http.server 5000 --bind 0.0.0.0
```

The server will be available at `http://localhost:5000`

### Features
1. **User Authentication** - Firebase Auth with email/password
2. **Real-time Feed** - Posts with text, images (carousel support), and videos
3. **User Profiles** - Customizable profiles with class, turma (section), and birthdate
4. **Search** - Search across posts and users
5. **Comments** - Real-time commenting on posts
6. **Like System** - Like and unlike posts
7. **View Counter** - Track post views
8. **Usage Analytics** - Track page visits in Firestore

## Deployment

The application is configured for deployment on Replit using autoscale:
- **Deployment Type**: Autoscale (stateless web app)
- **Run Command**: `python -m http.server 5000 --bind 0.0.0.0`
- **Port**: 5000

## Pages

1. **index.html** - Main feed with posts, search, and user profile
2. **login.html** - User login with Firebase Authentication
3. **registar.html** - New user registration
4. **recuperar-senha.html** - Password recovery
5. **aprenda.html** - Learning resources and materials
6. **horarios.html** - Class schedules
7. **noticias.html** - School news and announcements
8. **publicarnews.html** - Interface to publish news (likely admin only)

## Recent Changes
- **2025-10-07**: UI/UX Modernization - Theme System & Modal Improvements
  - **Página Home (home.html)**:
    - Removidos botões de curtida/comentário/compartilhar de fora dos cards de postagem
    - Card completo agora é clicável para abrir modal (melhor UX)
    - Botões de interatividade movidos para dentro do modal apenas
    - Corrigido bug do botão de curtida no modal que travava após primeiro clique
    - Implementado event listener apropriado para botão de compartilhar no modal (removendo JSON.stringify inline problemático)
    - Contagem de visualizações funciona corretamente ao abrir modal
  - **Sistema de Temas Implementado**:
    - Adicionado alternância tema claro/escuro em **noticias.html**, **horarios.html** e **aprenda.html**
    - Botão de toggle com ícones sol/lua no app bar de cada página
    - Persistência do tema usando localStorage (chave 'theme')
    - Cores consistentes: branco-dourado (claro) e preto-dourado (escuro)
    - Transições suaves entre temas
  - **Correções de Bugs**:
    - Removida referência ao arquivo inexistente `styles.css` em noticias.html (corrigindo erro 404)
    - Botão de curtida no modal agora reabilita imediatamente após operação (removido setTimeout)
    - Sistema de likes/unlikes funcionando corretamente sem travamentos

- **2025-10-07**: Quiz Modal Critical Bug Fixes (aprenda.html)
  - **Problema Resolvido**: Modal de quiz não aceitava seleção de opções nem mostrava justificação/certificado
  - **Correções Aplicadas**:
    - Tornei `initQuizzes` função global (`window.initQuizzes`) para ser acessível de dentro do módulo Firebase
    - Tornei `downloadCertificate` função global (`window.downloadCertificate`) para funcionar via onclick
    - Corrigi erro de sintaxe JavaScript adicionando declaração `const matematicaContent = [` que estava faltando
    - Adicionei todas as declarações de variáveis DOM necessárias (historiaModule, matematicaModule, learningModal, etc.)
  - **Status**: Quizzes agora funcionam perfeitamente - seleção de opções, feedback, e certificado funcionando

- **2025-10-06**: Bug Fixes and Feature Improvements
  - **Login Page**: Corrigido loop infinito removendo tag HTML malformada (`</old_str>`)
  - **Página Home**: 
    - Implementado preview truncado de publicações (3 linhas) com botão "Ver mais" para abrir modal completo
    - Corrigido CSS do modal para usar variáveis de tema, resolvendo problema de texto invisível no modo claro
    - Adicionada animação Lottie de carregamento usando `folhadeinhamissa.json`
  - **Página Aprenda**:
    - Corrigida duplicação de quizzes removendo div duplicada `#quiz-grid`
    - Implementado download de certificado como imagem PNG (Canvas API) ao invés de PDF
    - Certificado é gerado e baixado automaticamente quando aluno atinge 70% ou mais

- **2025-10-08**: Fresh GitHub Import Setup Completed
  - Successfully imported project from GitHub (fresh clone)
  - Fixed authentication flow in index.html:
    - Removed duplicate setTimeout blocks that caused redirect conflicts
    - Implemented Promise.all pattern to combine 3-second splash delay with Firebase auth check
    - Proper onAuthStateChanged listener with unsubscribe after first invocation
    - Clean redirect to home.html (authenticated) or login.html (not authenticated)
  - Python 3.11 already installed and configured
  - Configured workflow "Server" to serve static files on port 5000 with 0.0.0.0 binding
  - Set up autoscale deployment configuration for production
  - Verified splash screen loads correctly with Lottie animation
  - Firebase integration working correctly
  - Website fully functional and ready to use
  - Dependencies installed: python-docx (for document generation)

- **2025-10-07**: Fresh GitHub Import Setup Completed
  - Successfully imported project from GitHub (fresh clone)
  - Python 3.11 already installed and configured
  - Configured workflow "Server" to serve static files on port 5000 with 0.0.0.0 binding
  - Set up autoscale deployment configuration for production
  - Verified all pages load correctly (splash screen, login, home)
  - Firebase integration working correctly
  - Website fully functional and ready to use
  - Dependencies installed: python-docx (for document generation)

- **2025-10-06**: GitHub Import Setup Completed
  - Successfully imported project from GitHub
  - Installed Python 3.11 for HTTP server
  - Configured workflow "Server" to serve static files on port 5000 with 0.0.0.0 binding
  - Set up autoscale deployment configuration for production
  - Verified all pages load correctly (splash screen, login, home)
  - Firebase integration working correctly
  - Website fully functional and ready to use

## User Preferences
None recorded yet.

## Notes
- All pages use Firebase for data persistence
- The application is mobile-responsive with a bottom navigation bar
- Uses Portuguese (pt-MZ) as the primary language
- Black and yellow color scheme throughout the app
