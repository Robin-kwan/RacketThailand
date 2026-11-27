import { getImageProps, type ImageProps } from "next/image";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  failedSource: null as string | null,
  setFailedSource: vi.fn<(value: string) => void>(),
}));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useState: () => [state.failedSource, state.setFailedSource],
}));

import { ResilientImage } from "./resilient-image";

const src = "https://example.com/poster.jpg";
const error = {} as Parameters<NonNullable<ImageProps["onError"]>>[0];

describe("ResilientImage", () => {
  beforeEach(() => {
    state.failedSource = null;
    state.setFailedSource.mockReset();
  });

  it("keeps optimization, layout, and load callbacks on the first attempt", () => {
    const onLoad = vi.fn();
    const image = ResilientImage({ src, alt: "Poster", fill: true, sizes: "100vw", onLoad });
    expect(image.props).toMatchObject({ src, alt: "Poster", fill: true, sizes: "100vw", unoptimized: false, onLoad });
    image.props.onError?.(error);
    expect(state.setFailedSource).toHaveBeenCalledExactlyOnceWith(src);
  });

  it("retries the original without looping when the original also fails", () => {
    state.failedSource = src;
    const onError = vi.fn();
    const image = ResilientImage({ src, alt: "Poster", fill: true, onError });
    expect(image.props.unoptimized).toBe(true);
    const rendered = getImageProps(image.props).props;
    expect(rendered.src).toBe(src);
    expect(rendered.srcSet).toBeUndefined();
    image.props.onError?.(error);
    expect(state.setFailedSource).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("does not carry failure over to a different lightbox image", () => {
    state.failedSource = src;
    expect(ResilientImage({ src: "https://example.com/other.jpg", alt: "Other" }).props.unoptimized).toBe(false);
  });

  it("preserves explicit unoptimized images without retrying", () => {
    const image = ResilientImage({ src, alt: "QR", unoptimized: true });
    image.props.onError?.(error);
    expect(image.props.unoptimized).toBe(true);
    expect(state.setFailedSource).not.toHaveBeenCalled();
  });

  it("recognizes static imports when falling back", () => {
    state.failedSource = "/static/poster.jpg";
    const image = ResilientImage({ src: { src: state.failedSource, width: 853, height: 1280 }, alt: "Poster" });
    expect(image.props.unoptimized).toBe(true);
  });
});
