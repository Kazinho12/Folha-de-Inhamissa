
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

// Converter arquivo para base64 com método robusto
async function fileToBase64(file) {
    // Validar arquivo primeiro
    if (!file || !(file instanceof Blob)) {
        throw new Error('Arquivo inválido');
    }

    console.log('🔄 Convertendo arquivo para base64...', {
        name: file.name,
        type: file.type,
        size: file.size
    });

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        let timeoutId = setTimeout(() => {
            reader.abort();
            reject(new Error('Timeout na conversão base64'));
        }, 30000);

        reader.onloadend = () => {
            clearTimeout(timeoutId);
            
            if (reader.error) {
                console.error('❌ FileReader error:', reader.error);
                reject(new Error(`Erro ao ler arquivo: ${reader.error.message || 'desconhecido'}`));
                return;
            }

            if (!reader.result) {
                reject(new Error('FileReader não retornou resultado'));
                return;
            }

            try {
                const result = reader.result;
                console.log('✅ FileReader completou, processando resultado...');
                
                // Extrair base64 da data URL
                const matches = result.match(/^data:([^;]+);base64,(.+)$/);
                if (!matches || matches.length !== 3) {
                    throw new Error('Formato de data URL inválido');
                }

                const base64 = matches[2];
                if (!base64 || base64.length < 10) {
                    throw new Error('Base64 extraído está vazio ou inválido');
                }

                console.log('✅ Base64 extraído com sucesso', {
                    length: base64.length,
                    mimeType: matches[1]
                });
                
                resolve(base64);
            } catch (error) {
                console.error('❌ Erro ao processar resultado:', error);
                reject(new Error(`Falha ao processar base64: ${error.message}`));
            }
        };

        reader.onerror = (event) => {
            clearTimeout(timeoutId);
            console.error('❌ FileReader onerror disparado:', event);
            const errorMsg = reader.error ? reader.error.message : 'Erro desconhecido ao ler arquivo';
            reject(new Error(errorMsg));
        };

        reader.onabort = () => {
            clearTimeout(timeoutId);
            reject(new Error('Leitura do arquivo foi abortada'));
        };

        try {
            reader.readAsDataURL(file);
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('❌ Erro ao iniciar FileReader:', error);
            reject(new Error(`Falha ao iniciar leitura: ${error.message}`));
        }
    });
}

// Upload usando ImgBB com timeout
async function uploadToImgBB(file, onProgress) {
    return new Promise(async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('Timeout no upload ImgBB (15s)'));
        }, 15000); // 15 segundos de timeout

        try {
            // Validar arquivo antes de processar
            if (!file || !file.type || !file.type.startsWith('image/')) {
                throw new Error('Arquivo não é uma imagem válida');
            }

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
    return new Promise((resolve, reject) => {
        // Timeout de 60 segundos para upload Firebase
        const timeoutId = setTimeout(() => {
            reject(new Error('Timeout no upload Firebase (60s)'));
        }, 60000);

        try {
            console.log('🔥 Iniciando upload via Firebase Storage...', {
                name: file.name,
                size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                type: file.type
            });
            
            if (!storage) {
                clearTimeout(timeoutId);
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
            const uploadTask = uploadBytesResumable(storageRef, file, {
                contentType: file.type
            });

            let lastProgress = 10;
            const progressCheckInterval = setInterval(() => {
                if (lastProgress === uploadTask.snapshot.bytesTransferred / uploadTask.snapshot.totalBytes * 100) {
                    console.warn('⚠️ Upload pode estar travado, mas continuando...');
                }
            }, 5000);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const rawProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    const progress = 10 + (rawProgress * 0.85);
                    lastProgress = rawProgress;
                    
                    console.log(`📊 Progresso Firebase: ${Math.round(progress)}%`, 
                        `(${snapshot.bytesTransferred}/${snapshot.totalBytes} bytes)`);
                    if (onProgress) onProgress(progress);
                },
                (error) => {
                    clearTimeout(timeoutId);
                    clearInterval(progressCheckInterval);
                    console.error('❌ Erro durante upload Firebase:', error.code, error.message);
                    reject(new Error(`Firebase upload falhou: ${error.message || error.code}`));
                },
                async () => {
                    clearInterval(progressCheckInterval);
                    try {
                        if (onProgress) onProgress(95);
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        
                        clearTimeout(timeoutId);
                        if (onProgress) onProgress(100);
                        console.log('✅ Upload Firebase bem-sucedido:', downloadURL);
                        
                        resolve({
                            success: true,
                            url: downloadURL,
                            method: 'firebase'
                        });
                    } catch (error) {
                        clearTimeout(timeoutId);
                        console.error('❌ Erro ao obter URL do Firebase:', error);
                        reject(new Error(`Falha ao obter URL: ${error.message}`));
                    }
                }
            );

        } catch (error) {
            clearTimeout(timeoutId);
            console.error('❌ Falha ao iniciar upload Firebase:', error.message || error);
            reject(new Error(error.message || 'Falha ao iniciar upload'));
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
