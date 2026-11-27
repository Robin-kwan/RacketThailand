// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ track: vi.fn(), toast: vi.fn() }));
vi.mock("@vercel/analytics", () => ({ track: mocks.track }));
vi.mock("@/components/toaster", () => ({ showToast: mocks.toast }));
import { ContactActionValue } from "./contact-action-value";

const tracking = { groupId: "group-123", sport: "badminton", surface: "group_detail_sidebar" };
const labels = { copyLabel: "Copy", copiedLabel: "Copied", callLabel: "Call" };
const writeText = vi.fn();
beforeEach(() => {
  mocks.track.mockReset();
  mocks.toast.mockReset();
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, "clipboard");
});

describe("group contact actions", () => {
  it("counts a call without sending the phone number to analytics", () => {
    render(<div onClick={(event) => event.preventDefault()}><ContactActionValue mode="phone" value="081-234-5678" tracking={tracking} {...labels} /></div>);
    const link = screen.getByRole("link", { name: "Call" });
    expect(link.getAttribute("href")).toBe("tel:0812345678");
    fireEvent.click(link);
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith("group_contact_click", { ...tracking, method: "phone", action: "call" });
    expect(JSON.stringify(mocks.track.mock.calls)).not.toContain("081");
  });
  it("opens LINE without sending the account ID or destination URL to analytics", () => {
    render(<div onClick={(event) => event.preventDefault()}><ContactActionValue mode="line" value="private-line-id" tracking={tracking} {...labels} /></div>);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://line.me/ti/p/~private-line-id");
    fireEvent.click(link);
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith("group_contact_click", { ...tracking, method: "line", action: "open" });
    expect(JSON.stringify(mocks.track.mock.calls)).not.toContain("private-line-id");
  });
  it("counts a successful copy and keeps the copied value out of analytics", async () => {
    render(<ContactActionValue mode="line" value="private-line-id" tracking={tracking} {...labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await screen.findByRole("button", { name: "Copied" });
    expect(writeText).toHaveBeenCalledExactlyOnceWith("private-line-id");
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith("group_contact_click", { ...tracking, method: "line", action: "copy" });
    expect(JSON.stringify(mocks.track.mock.calls)).not.toContain("private-line-id");
  });
  it("does not count a clipboard failure as a successful contact action", async () => {
    writeText.mockRejectedValueOnce(new Error("Clipboard blocked"));
    render(<ContactActionValue mode="line" value="private-line-id" tracking={tracking} {...labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(mocks.track).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Copy" })).toBeTruthy();
  });
  it("does not add group analytics to shared court contact controls", () => {
    render(<div onClick={(event) => event.preventDefault()}><ContactActionValue mode="phone" value="081-234-5678" {...labels} /></div>);
    fireEvent.click(screen.getByRole("link", { name: "Call" }));
    expect(mocks.track).not.toHaveBeenCalled();
  });
});
