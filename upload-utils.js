// upload-utils.js - Sistema de upload otimizado com ImgBB e Firebase fallback
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js";

const IMGBB_API_KEY = '490019b11f119ad684399138b0226ff5';
const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';

let storage = null;

// Inicializar storage do Firebase
export function initUploadUtils(firebaseStorage) {
    storage = firebaseStorage;
    console.log('✅ Upload utils inicializado');
}

// Converter arquivo para base64 de forma robusta
async function fileToBase64(file) {
    if (!file || !(file instanceof Blob)) {
        throw new Error('Arquivo inválido');
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const timeout = setTimeout(() => {
            reader.abort();
            reject(new Error('Timeout ao ler arquivo (30s)'));
        }, 30000);

        reader.onload = () => {
            clearTimeout(timeout);
            const base64 = reader.result.split(',')[1];
            if (!base64) {
                reject(new Error('Falha ao extrair base64'));
                return;
            }
            resolve(base64);
        };

        reader.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Erro ao ler arquivo'));
        };

        reader.readAsDataURL(file);
    });
}

// Upload via ImgBB
async function uploadToImgBB(file, onProgress) {
    try {
        console.log('🌐 Iniciando upload ImgBB...', file.name);

        if (onProgress) onProgress(10);

        const base64 = await fileToBase64(file);

        if (onProgress) onProgress(30);

        const formData = new FormData();
        formData.append('image', base64);
        formData.append('name', file.name.replace(/[^a-zA-Z0-9._-]/g, '_'));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        if (onProgress) onProgress(50);

        const response = await fetch(`${IMGBB_API_URL}?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`ImgBB retornou ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !data.data?.url) {
            throw new Error('Resposta inválida do ImgBB');
        }

        if (onProgress) onProgress(100);

        console.log('✅ Upload ImgBB concluído:', data.data.url);
        return { success: true, url: data.data.url, method: 'imgbb' };

    } catch (error) {
        console.warn('⚠️ ImgBB falhou:', error.message);
        throw error;
    }
}

// Upload via Firebase Storage
async function uploadToFirebase(file, userId, onProgress) {
    return new Promise((resolve, reject) => {
        try {
            if (!storage) {
                throw new Error('Firebase Storage não inicializado');
            }

            console.log('🔥 Iniciando upload Firebase...', file.name);

            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8);
            const ext = file.name.split('.').pop();
            const fileName = `${timestamp}_${random}_${userId}.${ext}`;
            const storageRef = ref(storage, `uploads/${fileName}`);

            if (onProgress) onProgress(10);

            const uploadTask = uploadBytesResumable(storageRef, file, {
                contentType: file.type
            });

            const timeout = setTimeout(() => {
                uploadTask.cancel();
                reject(new Error('Timeout Firebase (60s)'));
            }, 60000);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = 10 + (snapshot.bytesTransferred / snapshot.totalBytes) * 85;
                    if (onProgress) onProgress(progress);

                    console.log(`📊 Firebase: ${Math.round(progress)}% (${snapshot.bytesTransferred}/${snapshot.totalBytes})`);
                },
                (error) => {
                    clearTimeout(timeout);
                    console.error('❌ Erro Firebase:', error);
                    reject(new Error(`Firebase: ${error.message || error.code}`));
                },
                async () => {
                    clearTimeout(timeout);
                    try {
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        if (onProgress) onProgress(100);
                        console.log('✅ Upload Firebase concluído:', url);
                        resolve({ success: true, url, method: 'firebase' });
                    } catch (error) {
                        reject(new Error(`Erro ao obter URL: ${error.message}`));
                    }
                }
            );

        } catch (error) {
            console.error('❌ Erro ao iniciar Firebase:', error);
            reject(error);
        }
    });
}

// Função principal de upload
export async function uploadImage(file, userId, onProgress) {
    if (!file) throw new Error('Arquivo não fornecido');
    if (!file.type?.startsWith('image/')) throw new Error('Arquivo deve ser uma imagem');

    const MAX_SIZE = 32 * 1024 * 1024; // 32MB
    if (file.size > MAX_SIZE) {
        throw new Error(`Imagem muito grande (máx 32MB). Tamanho: ${(file.size/1024/1024).toFixed(2)}MB`);
    }

    console.log('📤 Iniciando upload:', { name: file.name, size: `${(file.size/1024/1024).toFixed(2)}MB`, type: file.type });

    // Para imagens > 5MB, usar Firebase direto (ImgBB tem limite)
    if (file.size > 5 * 1024 * 1024) {
        console.log('📦 Imagem grande, usando Firebase...');
        return await uploadToFirebase(file, userId, onProgress);
    }

    // Tentar ImgBB primeiro
    try {
        return await uploadToImgBB(file, onProgress);
    } catch (imgbbError) {
        console.warn('⚠️ ImgBB falhou, tentando Firebase...', imgbbError.message);
        if (onProgress) onProgress(0); // Reset progress
    }

    // Fallback para Firebase
    try {
        return await uploadToFirebase(file, userId, onProgress);
    } catch (firebaseError) {
        throw new Error(`Todos os métodos falharam. Firebase: ${firebaseError.message}`);
    }
}

// Aliases
export const uploadQuizImage = uploadImage;
export const uploadNewsImage = uploadImage;

// Validar URL
export function isValidImageUrl(url) {
    if (!url) return false;
    try {
        new URL(url);
        return url.startsWith('http://') || url.startsWith('https://');
    } catch {
        return false;
    }
}