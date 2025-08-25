/**
 * Utilitaires de compression d'image pour respecter les limites Firestore
 * Limite Firestore : 1,048,487 bytes (≈ 1 MB)
 * Limite interface : 5 MB
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number;
}

export interface CompressedImageResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

/**
 * Compresse une image pour respecter la limite Firestore
 * @param file - Fichier image à compresser
 * @param options - Options de compression
 * @returns Promise avec le résultat de la compression
 */
export async function compressImageForFirestore(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.8,
    maxSizeBytes = 900000, // 900KB pour être sûr de rester sous 1MB
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      try {
        // Calculer les nouvelles dimensions
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Configurer le canvas
        canvas.width = width;
        canvas.height = height;

        // Dessiner l'image redimensionnée
        ctx?.drawImage(img, 0, 0, width, height);

        // Convertir en base64 avec qualité contrôlée
        let dataUrl = canvas.toDataURL("image/jpeg", quality);

        // Si l'image est encore trop grande, réduire la qualité progressivement
        let currentQuality = quality;
        while (dataUrl.length > maxSizeBytes && currentQuality > 0.1) {
          currentQuality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", currentQuality);
        }

        // Si c'est encore trop grand, essayer PNG avec compression
        if (dataUrl.length > maxSizeBytes) {
          dataUrl = canvas.toDataURL("image/png");
        }

        // Calculer les statistiques de compression
        const originalSize = file.size;
        const compressedSize = Math.round((dataUrl.length * 3) / 4); // Approximation base64
        const compressionRatio = (1 - compressedSize / originalSize) * 100;

        resolve({
          dataUrl,
          originalSize,
          compressedSize,
          compressionRatio,
          width,
          height,
        });
      } catch (error) {
        reject(new Error(`Erreur lors de la compression : ${error}`));
      }
    };

    img.onerror = () => {
      reject(new Error("Impossible de charger l'image"));
    };

    // Charger l'image depuis le fichier
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Vérifie si une image peut être compressée pour Firestore
 * @param file - Fichier à vérifier
 * @returns true si l'image peut être compressée
 */
export function canCompressImage(file: File): boolean {
  return file.type.startsWith("image/") && file.size > 0;
}

/**
 * Obtient la taille approximative d'un Data URL
 * @param dataUrl - Data URL à mesurer
 * @returns Taille approximative en bytes
 */
export function getDataUrlSize(dataUrl: string): number {
  // Approximation : base64 est environ 33% plus grand que les données binaires
  return Math.round((dataUrl.length * 3) / 4);
}

/**
 * Valide qu'une image compressée respecte les limites Firestore
 * @param dataUrl - Data URL à valider
 * @returns true si l'image respecte les limites
 */
export function isValidForFirestore(dataUrl: string): boolean {
  const size = getDataUrlSize(dataUrl);
  return size <= 1000000; // 1MB exact
}
