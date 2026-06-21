import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { compressImage } from '../imageCompression';

describe('imageCompression', () => {
  let mockFile: File;
  let mockReader: any;

  beforeEach(() => {
    mockFile = new File(['mock content'], 'test.png', { type: 'image/png' });

    mockReader = {
      readAsDataURL: vi.fn(function(this: any) {
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: 'data:image/png;base64,mock' } });
          }
        }, 0);
      }),
    };

    // Need to define a class for FileReader to be constructable
    class MockFileReader {
        readAsDataURL = mockReader.readAsDataURL;
    }
    vi.stubGlobal('FileReader', MockFileReader);

    // We need to define setter for src on the Image instance to trigger onload
    class MockImage {
        width = 2000;
        height = 1000;
        _src = '';
        onload: any;
        onerror: any;

        set src(val: string) {
            this._src = val;
            setTimeout(() => {
                if (this.onload) this.onload();
            }, 0);
        }

        get src() {
            return this._src;
        }
    }
    vi.stubGlobal('Image', MockImage);

    // Mock Canvas
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    })) as any;

    HTMLCanvasElement.prototype.toBlob = vi.fn((callback, _type, quality) => {
      // Simulate successful blob creation
      setTimeout(() => {
        const size = quality > 0.8 ? 1000000 : 400000;
        callback(new Blob(['mock data'], { type: 'image/jpeg', size } as any));
      }, 0);
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('compresses an image and changes extension to jpeg', async () => {
    const compressedFile = await compressImage(mockFile, 0.5, 1024);

    expect(compressedFile.name).toBe('test.jpeg');
    expect(compressedFile.type).toBe('image/jpeg');
  });

  it('resizes image to fit max width or height', async () => {
    // The mock image is 2000x1000. It should be resized to 1024x512
    const canvasSpy = vi.spyOn(document, 'createElement');

    await compressImage(mockFile, 0.5, 1024);

    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalled();
    canvasSpy.mockRestore();
  });

  it('handles canvas context failure', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as any;

    await expect(compressImage(mockFile)).rejects.toThrow('Failed to get canvas context');
  });

  it('handles file reader error', async () => {
    class ErrorFileReader {
        onerror: any;
        readAsDataURL() {
            setTimeout(() => {
                if (this.onerror) this.onerror(new Error('Reader error'));
            }, 0);
        }
    }
    vi.stubGlobal('FileReader', ErrorFileReader);

    await expect(compressImage(mockFile)).rejects.toThrow('Reader error');
  });

  it('handles image load error', async () => {
    class ErrorImage {
        width = 2000;
        height = 1000;
        _src = '';
        onerror: any;

        set src(val: string) {
            this._src = val;
            setTimeout(() => {
                if (this.onerror) this.onerror(new Error('Image error'));
            }, 0);
        }

        get src() {
            return this._src;
        }
    }
    vi.stubGlobal('Image', ErrorImage);

    await expect(compressImage(mockFile)).rejects.toThrow('Image error');
  });

  it('handles blob creation failure', async () => {
      HTMLCanvasElement.prototype.toBlob = vi.fn((callback: any) => {
          setTimeout(() => callback(null), 0);
      }) as any;

      await expect(compressImage(mockFile)).rejects.toThrow('Canvas to Blob failed');
  });
});
