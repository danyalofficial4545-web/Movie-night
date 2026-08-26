import { describe, expect, it } from "vitest";

describe("Supabase configuration", () => {
  it("accepts the configured project URL and API key", async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;

    expect(url).toBeTruthy();
    expect(key).toBeTruthy();

    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key! },
    });

    expect(response.ok).toBe(true);
  });

  it("accepts the configured service-role key for protected administration", async () => {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(url).toBeTruthy();
    expect(serviceRoleKey).toBeTruthy();

    const response = await fetch(`${url}/auth/v1/admin/users?per_page=1`, {
      headers: {
        apikey: serviceRoleKey!,
        Authorization: `Bearer ${serviceRoleKey!}`,
      },
    });

    expect(response.ok).toBe(true);
  });
});
