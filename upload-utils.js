
// upload-utils.js - Sistema de upload com ImgBB e Firebase fallback
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js";

const IMGBB_API_KEY = '490019b11f119ad684399138b0226ff5';
const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';

let storage = null;

// Inicializar storage do Firebase
export function initUploadUtils(firebaseStorage) {
    storage = firebaseStorage;
    console.log('✅ Upload utils inicializado com Firebase Storage');
}

// Converter arquivo para base64
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => {
            console.error('❌ Erro ao converter para base64:', error);
            reject(error);
        };
        reader.readAsDataURL(file);
    });
}

// Upload usando ImgBB com timeout
async function uploadToImgBB(file, onProgress) {
    return new Promise(async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Timeout no upload ImgBB (15s)'));
        }, 15000); // 15 segundos de timeout

        try {
            console.log('🌐 Tentando upload via ImgBB...', {
                name: file.name,
                size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                type: file.type
            });
            
            if (onProgress) onProgress(10);

            // Converter para base64
            const base64Image = await fileToBase64(file);
            
            if (onProgress) onProgress(30);

            // Criar FormData com base64
            const formData = new FormData();
            formData.append('image', base64Image);
            formData.append('name', file.name.replace(/\s/g, '_'));
            
            // Fazer upload com fetch
            const response = await fetch(`${IMGBB_API_URL}?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData,
                signal: AbortSignal.timeout(12000) // Timeout adicional no fetch
            });

            if (onProgress) onProgress(70);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro ImgBB - Status:', response.status);
                console.error('❌ Resposta:', errorText);
                throw new Error(`ImgBB retornou status ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success || !data.data || !data.data.url) {
                console.error('❌ Resposta inválida do ImgBB:', data);
                throw new Error('Resposta inválida do ImgBB');
            }

            if (onProgress) onProgress(100);
            
            clearTimeout(timeoutId);
            console.log('✅ Upload ImgBB bem-sucedido:', data.data.url);
            resolve({
                success: true,
                url: data.data.url,
                method: 'imgbb'
            });

        } catch (error) {
            clearTimeout(timeoutId);
            console.error('❌ Falha no upload ImgBB:', error.message);
            reject(error);
        }
    });
}

// Upload usando Firebase Storage com tratamento robusto
async function uploadToFirebase(file, userId, onProgress) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('🔥 Iniciando upload via Firebase Storage...', {
                name: file.name,
                size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                type: file.type
            });
            
            if (!storage) {
                throw new Error('Firebase Storage não inicializado');
            }

            if (onProgress) onProgress(10);

            // Criar referência única com timestamp
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 8);
            const fileName = `${timestamp}_${randomStr}_${userId}.${fileExtension}`;
            const storageRef = ref(storage, `uploads/${fileName}`);

            console.log('📁 Referência criada:', fileName);

            // Upload com progresso
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = 10 + (snapshot.bytesTransferred / snapshot.totalBytes) * 85;
                    console.log(`📊 Progresso Firebase: ${Math.round(progress)}%`, 
                        `(${snapshot.bytesTransferred}/${snapshot.totalBytes} bytes)`);
                    if (onProgress) onProgress(progress);
                },
                (error) => {
                    console.error('❌ Erro durante upload Firebase:', error.code, error.message);
                    reject(new Error(`Firebase upload falhou: ${error.message}`));
                },
                async () => {
                    try {
                        if (onProgress) onProgress(95);
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        
                        if (onProgress) onProgress(100);
                        console.log('✅ Upload Firebase bem-sucedido:', downloadURL);
                        
                        resolve({
                            success: true,
                            url: downloadURL,
                            method: 'firebase'
                        });
                    } catch (error) {
                        console.error('❌ Erro ao obter URL do Firebase:', error);
                        reject(new Error(`Falha ao obter URL: ${error.message}`));
                    }
                }
            );

        } catch (error) {
            console.error('❌ Falha ao iniciar upload Firebase:', error.message);
            reject(error);
        }
    });
}

// Função principal de upload com fallback automático
export async function uploadImage(file, userId, onProgress) {
    if (!file) {
        throw new Error('Nenhum arquivo fornecido');
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
        throw new Error('O arquivo deve ser uma imagem');
    }

    // Validar tamanho (máx 32MB)
    const MAX_SIZE = 32 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        throw new Error(`Imagem muito grande. Máximo 32MB. Tamanho atual: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    console.log('📤 Iniciando upload de imagem...', {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        type: file.type
    });

    // Tentar ImgBB primeiro (mais rápido)
    try {
        const result = await uploadToImgBB(file, onProgress);
        console.log('✅ Upload concluído via ImgBB');
        return result;
    } catch (imgbbError) {
        console.warn('⚠️ ImgBB falhou, usando Firebase como fallback...', imgbbError.message);
        
        // Resetar progresso para Firebase
        if (onProgress) onProgress(0);
    }

    // Se ImgBB falhar, usar Firebase como fallback
    try {
        const result = await uploadToFirebase(file, userId, onProgress);
        console.log('✅ Upload concluído via Firebase (fallback)');
        return result;
    } catch (firebaseError) {
        console.error('❌ Firebase também falhou:', firebaseError.message);
        throw new Error(`Todos os métodos de upload falharam. Firebase: ${firebaseError.message}`);
    }
}

// Aliases para compatibilidade
export const uploadQuizImage = uploadImage;
export const uploadNewsImage = uploadImage;

// Função auxiliar para validar URL de imagem
export function isValidImageUrl(url) {
    if (!url) return false;
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    } catch {
        return false;
    }
}
