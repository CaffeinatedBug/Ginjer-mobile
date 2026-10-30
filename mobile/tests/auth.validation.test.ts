import { describe, test, expect } from "@jest/globals";
import { loginSchema, signUpSchema } from "../src/features/auth/validation";
describe("auth form validation", () => {
  test("rejects blank defaults and malformed email", () => {
    expect(loginSchema.safeParse({ emailId: "", password: "" }).success).toBe(
      false,
    );
    expect(
      loginSchema.safeParse({ emailId: "invalid", password: "test-only" })
        .success,
    ).toBe(false);
  });
  test("requires confirmation to match without trimming passwords", () => {
    expect(
      signUpSchema.safeParse({
        firstName: "Test",
        lastName: "User",
        emailId: "test@example.invalid",
        password: " test-only ",
        confirmPassword: "test-only",
      }).success,
    ).toBe(false);
  });
});
