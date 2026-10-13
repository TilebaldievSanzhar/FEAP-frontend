import { afterEach, describe, expect, it } from "vitest";

import { setAuthToken } from "@/api/auth";
import { sseUrl } from "@/api/client";
import { getConfig } from "@/lib/config";

describe("sseUrl", () => {
  afterEach(() => setAuthToken(null));

  it("leaves the URL untouched without a session", () => {
    const { apiBaseUrl } = getConfig();
    expect(sseUrl("/api/v1/jobs/j1/events")).toBe(`${apiBaseUrl}/api/v1/jobs/j1/events`);
  });

  it("passes the token as ?access_token= (EventSource has no headers)", () => {
    setAuthToken("abc.def.ghi");
    expect(sseUrl("/api/v1/jobs/j1/events")).toMatch(/\/api\/v1\/jobs\/j1\/events\?access_token=abc\.def\.ghi$/);
  });

  it("appends to an existing query string and encodes the token", () => {
    setAuthToken("a+b/c=");
    expect(sseUrl("/api/v1/jobs/j1/events?since=5")).toMatch(/\?since=5&access_token=a%2Bb%2Fc%3D$/);
  });
});
