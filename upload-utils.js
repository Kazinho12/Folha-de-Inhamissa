
// upload-utils.js - Sistema de upload com ImgBB e Firebase fallback
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js";

const IMGBB_API_KEY = '490019b11f119ad684399138b0226ff5';
const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';

let storage = null;

// Inicializar storage do Firebase
export function initUploadUtils(firebaseStorage) {
    storage = firebaseStorage;
}

// Converter arquivo para base64
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Upload usando ImgBB
async function uploadToImgBB(file, onProgress) {
    try {
        console.log('Tentando upload via ImgBB...');
        
        if (onProgress) onProgress(10);

        // Converter para base64
        const base64Image = await fileToBase64(file);
        
        if (onProgress) onProgress(30);

        // Criar FormData com base64
        const formData = new FormData();
        formData.append('image', base64Image);
        
        // Fazer upload
        const response = await fetch(`${IMGBB_API_URL}?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        if (onProgress) onProgress(70);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro ImgBB:', errorText);
            throw new Error(`ImgBB retornou status ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.data || !data.data.url) {
            throw new Error('Resposta inválida do ImgBB');
        }

        if (onProgress) onProgress(100);
        
        console.log('Upload ImgBB bem-sucedido:', data.data.url);
        return {
            success: true,
            url: data.data.url,
            method: 'imgbb'
        };

    } catch (error) {
        console.error('Falha no upload ImgBB:', error);
        throw error;
    }
}

// Upload usando Firebase Storage
async function uploadToFirebase(file, userId, onProgress) {
    try {
        console.log('Tentando upload via Firebase Storage...');
        
        if (!storage) {
            throw new Error('Firebase Storage não inicializado');
        }

        if (onProgress) onProgress(10);

        // Criar referência única
        const fileExtension = file.name.split('.').pop();
        const fileName = `quiz_${Date.now()}_${userId}.${fileExtension}`;
        const storageRef = ref(storage, `quizzes/images/${fileName}`);

        // Upload com progresso
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = 10 + (snapshot.bytesTransferred / snapshot.totalBytes) * 90;
                    if (onProgress) onProgress(progress);
                },
                (error) => {
                    console.error('Erro Firebase Storage:', error);
                    reject(error);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        console.log('Upload Firebase bem-sucedido:', downloadURL);
                        resolve({
                            success: true,
                            url: downloadURL,
                            method: 'firebase'
                        });
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });

    } catch (error) {
        console.error('Falha no upload Firebase:', error);
        throw error;
    }
}

// Função principal de upload com fallback
export async function uploadQuizImage(file, userId, onProgress) {
    if (!file) {
        throw new Error('Nenhum arquivo fornecido');
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
        throw new Error('O arquivo deve ser uma imagem');
    }

    // Validar tamanho (máx 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        throw new Error('Imagem muito grande. Máximo 5MB');
    }

    let lastError = null;

    // Tentar ImgBB primeiro
    try {
        const result = await uploadToImgBB(file, onProgress);
        return result;
    } catch (imgbbError) {
        console.warn('ImgBB falhou, tentando Firebase...', imgbbError);
        lastError = imgbbError;
    }

    // Se ImgBB falhar, tentar Firebase
    try {
        const result = await uploadToFirebase(file, userId, onProgress);
        return result;
    } catch (firebaseError) {
        console.error('Firebase também falhou:', firebaseError);
        lastError = firebaseError;
    }

    // Se ambos falharem
    throw new Error(`Upload falhou (ImgBB e Firebase): ${lastError.message}`);
}

// Função auxiliar para validar URL de imagem
export function isValidImageUrl(url) {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}
