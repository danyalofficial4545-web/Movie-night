import { describe, expect, it } from "vitest";
import { ADMIN_EMAIL, isAdminEmail, isDesignatedAdmin } from "./db";

describe("ProMovie role policy", () => {
  it("grants administrator status only to the configured administrator email", () => {
    expect(isAdminEmail(ADMIN_EMAIL)).toBe(true);
    expect(isAdminEmail("MUHAMMADDANYAL4545@GMAIL.COM")).toBe(true);
    expect(isAdminEmail("member@example.com")).toBe(false);
  });

  it("does not treat a non-administrator email as an administrator even when role data conflicts", () => {
    const conflictingRecord = { email: "member@example.com", role: "admin" as const };
    expect(conflictingRecord.role).toBe("admin");
    expect(isAdminEmail(conflictingRecord.email)).toBe(false);
  });

  it("recognizes only the configured administrator email and mobile identity", () => {
    expect(isDesignatedAdmin("muhammaddanyal4545@gmail.com", "03311332670")).toBe(true);
    expect(isDesignatedAdmin("muhammaddanyal4545@gmail.com", "03000000000")).toBe(false);
  });
});
