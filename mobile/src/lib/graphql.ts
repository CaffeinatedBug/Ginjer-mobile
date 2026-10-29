import { z } from "zod";
import { API_URL, REQUEST_TIMEOUT_MS } from "./config";
import { ApiError } from "./errors";
let getToken: () => string | undefined = () => undefined;
let expire: () => void = () => {};
export function configureAuth(
  token: () => string | undefined,
  onExpire: () => void,
) {
  getToken = token;
  expire = onExpire;
}
export async function request<T>(
  query: string,
  variables: Record<string, unknown>,
  schema: z.ZodType<T>,
  options: {
    signal?: AbortSignal;
    mutation?: boolean;
    authenticated?: boolean;
  } = {},
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel);
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(cancel, REQUEST_TIMEOUT_MS);
  const authenticated = options.authenticated !== false;
  const token = authenticated ? getToken() : undefined;
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { authorization: token } : {}),
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    const body: z.infer<typeof envelope> = envelope.parse(
      await response.json(),
    );
    const codes = body.errors?.map((e) => e.extensions?.code) ?? [];
    const rejectedPassword =
      options.authenticated === false &&
      query.includes("query SignIn") &&
      body.errors?.some(
        (e) =>
          e.extensions?.code === "INTERNAL_SERVER_ERROR" &&
          e.path?.length === 1 &&
          e.path[0] === "signIn" &&
          /invalid/i.test(e.message ?? "") &&
          /password/i.test(e.message ?? ""),
      );
    if (rejectedPassword)
      throw new ApiError("Email or password was not accepted.", "auth");
    if (response.status === 401 || codes.includes("UNAUTHENTICATED")) {
      if (authenticated) expire();
      throw new ApiError(
        authenticated
          ? "Your session has expired. Sign in again."
          : "Email or password was not accepted.",
        "auth",
      );
    }
    if (body.errors?.length) {
      if (
        codes.includes("BAD_USER_INPUT") ||
        codes.includes("GRAPHQL_VALIDATION_FAILED")
      )
        throw new ApiError(
          "The request was not accepted. Check your entries.",
          "validation",
        );
      throw new ApiError(
        "The server could not complete this request.",
        "server",
      );
    }
    if (!response.ok)
      throw new ApiError("The server is unavailable.", "server");
    return schema.parse(body.data);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.mutation)
      throw new ApiError(
        "Delivery is uncertain. Check the device before attempting another command.",
        "uncertain",
      );
    if (options.signal?.aborted) throw error;
    if (error instanceof z.ZodError)
      throw new ApiError(
        "The server response did not match the verified contract.",
        "validation",
      );
    throw new ApiError(
      "Cannot reach the server. Check your connection.",
      "network",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}
const envelope = z.object({
  data: z.unknown().optional(),
  errors: z
    .array(
      z.object({
        message: z.string().optional(),
        path: z.array(z.union([z.string(), z.number()])).optional(),
        extensions: z.object({ code: z.string().optional() }).optional(),
      }),
    )
    .optional(),
});
