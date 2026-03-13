export const compressImage = async (file: File, maxSizeMB: number = 0.5, maxWidthOrHeight: number = 1024): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Calculate aspect ratio and resize if needed
                if (width > height) {
                    if (width > maxWidthOrHeight) {
                        height = Math.round((height * maxWidthOrHeight) / width);
                        width = maxWidthOrHeight;
                    }
                } else {
                    if (height > maxWidthOrHeight) {
                        width = Math.round((width * maxWidthOrHeight) / height);
                        height = maxWidthOrHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Fill background with white (in case of transparent PNGs being converted to JPEG)
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.9;
                const targetSizeBytes = maxSizeMB * 1024 * 1024;

                const tryCompress = () => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Canvas to Blob failed'));
                                return;
                            }

                            if (blob.size <= targetSizeBytes || quality <= 0.3) {
                                // Done compressing
                                // Create a new filename preventing multiple extension issues .png.jpeg -> .jpeg
                                const originalNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                                const newFilename = `${originalNameWithoutExt}.jpeg`;

                                const newFile = new File([blob], newFilename, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                });
                                resolve(newFile);
                            } else {
                                quality -= 0.1;
                                tryCompress();
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };

                tryCompress();
            };

            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
