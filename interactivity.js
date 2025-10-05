
// interactivity.js - Sistema de curtidas e comentários
import { 
    getFirestore, 
    doc, 
    getDoc, 
    updateDoc, 
    increment, 
    addDoc, 
    collection, 
    serverTimestamp,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

let db = null;
let auth = null;
let currentUserData = null;

// Inicializar interatividade
export function initInteractivity(firebaseDb, firebaseAuth, userData) {
    db = firebaseDb;
    auth = firebaseAuth;
    currentUserData = userData;
}

// Função para mostrar toast
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Função para curtir/descurtir publicação
export async function toggleLike(postId, likeBtn) {
    const user = auth?.currentUser;

    if (!user) {
        showToast('Faça login para curtir', 'error');
        return false;
    }

    if (!postId || !likeBtn) {
        showToast('Erro: Dados inválidos', 'error');
        return false;
    }

    if (likeBtn.disabled) return false;
    
    likeBtn.disabled = true;

    try {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);

        if (!postDoc.exists()) {
            showToast('Esta publicação não existe mais', 'error');
            return false;
        }

        const postData = postDoc.data();
        const likedBy = postData.likedBy || [];
        const hasLiked = likedBy.includes(user.uid);

        if (hasLiked) {
            // Remover curtida
            await updateDoc(postRef, {
                likes: increment(-1),
                likedBy: likedBy.filter(id => id !== user.uid)
            });

            // Atualizar UI
            likeBtn.classList.remove('liked');
            const icon = likeBtn.querySelector('i');
            const span = likeBtn.querySelector('span');
            
            if (icon) icon.className = 'far fa-thumbs-up';
            if (span) {
                const currentCount = parseInt(span.textContent.match(/\d+/)?.[0] || '0');
                span.textContent = `${Math.max(0, currentCount - 1)} Curtir`;
            }

            showToast('Curtida removida', 'success');
        } else {
            // Adicionar curtida
            await updateDoc(postRef, {
                likes: increment(1),
                likedBy: [...likedBy, user.uid]
            });

            // Atualizar UI
            likeBtn.classList.add('liked');
            const icon = likeBtn.querySelector('i');
            const span = likeBtn.querySelector('span');
            
            if (icon) icon.className = 'fas fa-thumbs-up';
            if (span) {
                const currentCount = parseInt(span.textContent.match(/\d+/)?.[0] || '0');
                span.textContent = `${currentCount + 1} Curtir`;
            }

            showToast('Publicação curtida!', 'success');
        }

        return true;

    } catch (error) {
        console.error('Erro ao curtir:', error);
        
        let errorMessage = 'Erro ao curtir. Tente novamente.';
        
        if (error.code === 'permission-denied') {
            errorMessage = 'Sem permissão para curtir. Verifique as regras do Firestore.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'Serviço temporariamente indisponível.';
        } else if (!navigator.onLine) {
            errorMessage = 'Sem conexão com a internet.';
        }
        
        showToast(errorMessage, 'error');
        return false;
    } finally {
        setTimeout(() => {
            if (likeBtn) {
                likeBtn.disabled = false;
            }
        }, 500);
    }
}

// Função para verificar se usuário curtiu
export async function checkIfLiked(postId, postData, likeBtn) {
    try {
        if (!auth?.currentUser || !postData || !likeBtn) return;

        const likedBy = postData.likedBy || [];
        if (likedBy.includes(auth.currentUser.uid)) {
            likeBtn.classList.add('liked');
            const icon = likeBtn.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-thumbs-up';
            }
        }
    } catch (error) {
        console.error('Erro ao verificar curtida:', error);
    }
}

// Função para adicionar comentário
export async function addComment(postId, content) {
    const user = auth?.currentUser;
    
    if (!user) {
        showToast('Faça login para comentar', 'error');
        return false;
    }

    if (!content || !content.trim()) {
        showToast('Digite um comentário válido', 'error');
        return false;
    }

    if (!postId) {
        showToast('Erro: Publicação não identificada', 'error');
        return false;
    }

    if (content.trim().length > 500) {
        showToast('Comentário muito longo (máximo 500 caracteres)', 'error');
        return false;
    }

    try {
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);

        if (!postDoc.exists()) {
            showToast('Esta publicação não existe mais', 'error');
            return false;
        }

        // Adicionar comentário
        await addDoc(collection(db, 'comments'), {
            postId: postId,
            content: content.trim(),
            authorId: user.uid,
            authorName: currentUserData?.name || 'Usuário',
            authorPhotoURL: currentUserData?.photoURL || null,
            createdAt: serverTimestamp()
        });

        // Incrementar contador
        await updateDoc(postRef, {
            comments: increment(1)
        });

        showToast('Comentário adicionado!', 'success');
        return true;

    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);

        let errorMessage = 'Erro ao adicionar comentário. Tente novamente.';
        if (error.code === 'permission-denied') {
            errorMessage = 'Sem permissão para comentar nesta publicação.';
        } else if (error.code === 'not-found') {
            errorMessage = 'Publicação não encontrada.';
        }

        showToast(errorMessage, 'error');
        return false;
    }
}

// Função para carregar comentários
export async function loadComments(postId) {
    try {
        if (!postId) {
            console.warn('PostId não fornecido para carregar comentários');
            return [];
        }

        const commentsQuery = query(
            collection(db, 'comments'),
            where('postId', '==', postId)
        );

        const commentsSnapshot = await getDocs(commentsQuery);
        const comments = [];

        commentsSnapshot.forEach((doc) => {
            comments.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar por data (mais recentes primeiro)
        comments.sort((a, b) => {
            if (!a.createdAt || !b.createdAt) return 0;
            return b.createdAt.toMillis() - a.createdAt.toMillis();
        });

        return comments;

    } catch (error) {
        console.error('Erro ao carregar comentários:', error);
        return [];
    }
}

// Função para renderizar comentários
export function renderComments(comments, commentListElement) {
    if (!commentListElement) return;

    commentListElement.innerHTML = '';

    if (comments.length === 0) {
        commentListElement.innerHTML = '<p style="text-align: center; color: var(--gray); padding: 20px;">Nenhum comentário ainda. Seja o primeiro!</p>';
        return;
    }

    comments.forEach((comment) => {
        const commentDate = comment.createdAt ? 
            comment.createdAt.toDate().toLocaleString('pt-MZ') : 
            'Agora';

        let authorAvatar = '';
        if (comment.authorPhotoURL) {
            authorAvatar = `<img src="${comment.authorPhotoURL}" alt="Foto do autor" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                           <span style="display: none;">${(comment.authorName || 'U').split(' ').map(n => n[0]).join('').toUpperCase()}</span>`;
        } else {
            authorAvatar = (comment.authorName || 'Usuário').split(' ').map(n => n[0]).join('').toUpperCase();
        }

        const commentElement = document.createElement('div');
        commentElement.className = 'comment-item';
        commentElement.innerHTML = `
            <div class="comment-avatar">${authorAvatar}</div>
            <div class="comment-content">
                <div class="comment-author">${comment.authorName || 'Usuário'}</div>
                <div class="comment-text">${comment.content || ''}</div>
                <div class="comment-time">${commentDate}</div>
            </div>
        `;
        commentListElement.appendChild(commentElement);
    });
}

// Função para submeter comentário (wrapper)
export async function submitComment(postId) {
    if (!postId) {
        showToast('Erro: ID da publicação não encontrado', 'error');
        return false;
    }

    const commentInput = document.getElementById(`comment-input-${postId}`);
    if (!commentInput) {
        showToast('Erro: Campo de comentário não encontrado', 'error');
        return false;
    }

    const commentText = commentInput.value.trim();

    if (!commentText) {
        showToast('Digite um comentário', 'error');
        commentInput.focus();
        return false;
    }

    commentInput.disabled = true;

    try {
        const success = await addComment(postId, commentText);
        if (success) {
            commentInput.value = '';
            
            // Recarregar comentários
            const commentListElement = document.getElementById(`comment-list-${postId}`);
            if (commentListElement) {
                const comments = await loadComments(postId);
                renderComments(comments, commentListElement);
            }
        }
        return success;
    } catch (error) {
        console.error('Erro ao submeter comentário:', error);
        showToast('Erro inesperado ao comentar', 'error');
        return false;
    } finally {
        commentInput.disabled = false;
        commentInput.focus();
    }
}
