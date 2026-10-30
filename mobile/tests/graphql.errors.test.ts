import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { z } from "zod";
import { configureAuth, request } from "../src/lib/graphql";

const schema = z.object({ signIn: z.string() });
const signInQuery = "query SignIn { signIn { token } }";
const response = (body: unknown, status = 200) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  }) as Response;
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("GraphQL error classification", () => {
  test("maps only the verified bad-password sign-in shape to auth", async () => {
    globalThis.fetch = jest.fn(async () =>
      response({
        errors: [
          {
            message: "Invalid password",
            path: ["signIn"],
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          },
        ],
      }),
    ) as typeof fetch;
    await expect(
      request(signInQuery, {}, schema, { authenticated: false }),
    ).rejects.toMatchObject({ kind: "auth" });
    globalThis.fetch = jest.fn(async () =>
      response({
        errors: [
          {
            message: "Backend unavailable",
            path: ["signIn"],
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          },
        ],
      }),
    ) as typeof fetch;
    await expect(
      request(signInQuery, {}, schema, { authenticated: false }),
    ).rejects.toMatchObject({ kind: "server" });
    globalThis.fetch = jest.fn(async () =>
      response({
        errors: [
          {
            message: "Invalid password",
            path: ["other"],
            extensions: { code: "INTERNAL_SERVER_ERROR" },
          },
        ],
      }),
    ) as typeof fetch;
    await expect(
      request(signInQuery, {}, schema, { authenticated: false }),
    ).rejects.toMatchObject({ kind: "server" });
  });

  test("keeps network failures separate and never adds Bearer to raw token", async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new TypeError("Network failed");
    }) as typeof fetch;
    await expect(
      request(signInQuery, {}, schema, { authenticated: false }),
    ).rejects.toMatchObject({ kind: "network" });
    const expire = jest.fn();
    configureAuth(() => "test-token", expire);
    const mockedFetch = jest.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        response({
          errors: [
            {
              message: "Invalid user",
              path: ["accounts"],
              extensions: { code: "UNAUTHENTICATED" },
            },
          ],
        }),
    );
    globalThis.fetch = mockedFetch as typeof fetch;
    await expect(
      request("query OrgList { accounts { name } }", {}, z.unknown()),
    ).rejects.toMatchObject({ kind: "auth" });
    expect(expire).toHaveBeenCalledTimes(1);
    expect(mockedFetch.mock.calls[0]?.[1]?.headers).toMatchObject({
      authorization: "test-token",
    });
  });
});
