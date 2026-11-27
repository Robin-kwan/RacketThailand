import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { optimizePhotoFile } from "./image-upload";

const file = (bytes: number, type = "image/jpeg") =>
  new File([new Uint8Array(bytes)], "court.jpg", { type });

describe("optimizePhotoFile", () => {
  let canvas: {
    width: number;
    height: number;
    getContext: ReturnType<typeof vi.fn>;
    toBlob: ReturnType<typeof vi.fn>;
  };
  let createElement: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ fillRect: vi.fn(), drawImage: vi.fn() })),
      toBlob: vi.fn((callback: BlobCallback, type: string) => {
        callback(new Blob([new Uint8Array(120_000)], { type }));
      }),
    };
    createElement = vi.fn(() => canvas);
    vi.stubGlobal("document", { createElement });
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({
      width: 1200, height: 1600, close: vi.fn(),
    })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("compresses medium-sized photos that previously passed through unchanged", async () => {
    const output = await optimizePhotoFile(file(500_000));
    expect(output.type).toBe("image/webp");
    expect(output.name).toBe("court.webp");
    expect(output.size).toBe(120_000);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.82);
  });

  it("leaves small, correctly sized photos untouched", async () => {
    const input = file(100_000);
    expect(await optimizePhotoFile(input)).toBe(input);
    expect(createElement).not.toHaveBeenCalled();
  });

  it("resizes large dimensions without cropping or changing the aspect ratio", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({
      width: 4000, height: 2000, close: vi.fn(),
    })));
    await optimizePhotoFile(file(100_000));
    expect([canvas.width, canvas.height]).toEqual([1800, 900]);
  });

  it("falls back to JPEG when the browser cannot encode WebP", async () => {
    canvas.toBlob.mockImplementation((callback: BlobCallback, type: string) => {
      callback(new Blob([new Uint8Array(150_000)], { type: type === "image/webp" ? "image/png" : type }));
    });
    const output = await optimizePhotoFile(file(500_000));
    expect(output.type).toBe("image/jpeg");
    expect(output.name).toBe("court.jpg");
  });

  it("never replaces a smaller source with a larger encoded file", async () => {
    canvas.toBlob.mockImplementation((callback: BlobCallback, type: string) => {
      callback(new Blob([new Uint8Array(600_000)], { type }));
    });
    const input = file(500_000);
    expect(await optimizePhotoFile(input)).toBe(input);
  });

  it("honors a caller's smaller upload limit even for small files", async () => {
    canvas.toBlob.mockImplementation((callback: BlobCallback, type: string) => {
      callback(new Blob([new Uint8Array(30_000)], { type }));
    });
    const output = await optimizePhotoFile(file(100_000), { maxOutputMB: 0.05 });
    expect(output.size).toBe(30_000);
  });

  it("reports failed canvas encoding instead of uploading an empty image", async () => {
    canvas.toBlob.mockImplementation((callback: BlobCallback) => callback(null));
    await expect(optimizePhotoFile(file(500_000))).rejects.toThrow("Could not optimize image.");
  });
});
