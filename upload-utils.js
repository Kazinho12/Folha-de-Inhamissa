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

// Converter arquivo para base64 com método robusto e validação completa
async function fileToBase64(file) {
    // Validações iniciais
    if (!file) {
        throw new Error('Arquivo não fornecido');
    }

    if (!(file instanceof Blob) && !(file instanceof File)) {
        throw new Error('Tipo de arquivo inválido');
    }

    // Verificar se o arquivo é válido e tem conteúdo
    if (!file.type || !file.type.startsWith('image/')) {
        throw new Error('O arquivo deve ser uma imagem');
    }

    if (file.size === 0) {
        throw new Error('Arquivo vazio');
    }

    console.log('🔄 Convertendo arquivo para base64...', {
        name: file.name,
        type: file.type,
        size: file.size
    });

    return new Promise((resolve, reject) => {
        // Criar um novo FileReader
        const reader = new FileReader();

        // Timeout de 15 segundos para conversão
        const timeoutId = setTimeout(() => {
            reader.abort();
            reject(new Error('Timeout na conversão (15s)'));
        }, 15000);

        // Evento de sucesso
        reader.onload = (event) => {
            clearTimeout(timeoutId);

            try {
                const result = event.target.result;

                if (!result || typeof result !== 'string') {
                    throw new Error('Resultado da leitura inválido');
                }

                // Extrair base64 da data URL
                const base64Match = result.match(/^data:([^;]+);base64,(.+)$/);
                if (!base64Match || base64Match.length < 3) {
                    throw new Error('Formato de data URL inválido');
                }

                const base64Data = base64Match[2];

                if (!base64Data || base64Data.length < 10) {
                    throw new Error('Base64 extraído está vazio');
                }

                console.log('✅ Base64 extraído com sucesso', {
                    length: base64Data.length,
                    mimeType: base64Match[1]
                });

                resolve(base64Data);
            } catch (error) {
                console.error('❌ Erro ao processar resultado:', error);
                reject(error);
            }
        };

        // Evento de erro
        reader.onerror = () => {
            clearTimeout(timeoutId);
            console.error('❌ Erro ao ler arquivo');
            reject(new Error('Falha ao ler o arquivo. Tente novamente.'));
        };

        // Evento de abortar
        reader.onabort = () => {
            clearTimeout(timeoutId);
            reject(new Error('Leitura do arquivo cancelada'));
        };

        // Iniciar leitura
        try {
            reader.readAsDataURL(file);
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('❌ Erro ao iniciar leitura:', error);
            reject(new Error('Não foi possível iniciar a leitura do arquivo'));
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
        // Timeout de 30 segundos para upload Firebase
        const timeoutId = setTimeout(() => {
            reject(new Error('Timeout no upload Firebase (30s)'));
        }, 30000);

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

            let lastBytesTransferred = 0;
            let stuckCounter = 0;

            const progressCheckInterval = setInterval(() => {
                if (uploadTask.snapshot) {
                    const currentBytes = uploadTask.snapshot.bytesTransferred;
                    if (currentBytes === lastBytesTransferred && currentBytes < uploadTask.snapshot.totalBytes) {
                        stuckCounter++;
                        if (stuckCounter > 3) {
                            console.error('❌ Upload travado, cancelando...');
                            clearInterval(progressCheckInterval);
                            clearTimeout(timeoutId);
                            uploadTask.cancel();
                            reject(new Error('Upload travado'));
                        }
                    } else {
                        stuckCounter = 0;
                        lastBytesTransferred = currentBytes;
                    }
                }
            }, 3000);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const rawProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    const progress = 10 + (rawProgress * 0.85);

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

    // Para imagens maiores que 500KB, usar Firebase direto
    const imgbbMaxSize = 500 * 1024; // 500KB

    if (file.size > imgbbMaxSize) {
        console.log('📦 Imagem grande, usando Firebase Storage diretamente...');
        try {
            const result = await uploadToFirebase(file, userId, onProgress);
            console.log('✅ Upload concluído via Firebase');
            return result;
        } catch (firebaseError) {
            console.error('❌ Firebase falhou:', firebaseError.message);
            throw new Error(`Upload falhou: ${firebaseError.message}`);
        }
    }

    // Tentar ImgBB primeiro para imagens pequenas
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