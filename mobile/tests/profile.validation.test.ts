import { describe, test, expect } from "@jest/globals";
import {
  profileSchema,
  profileInput,
} from "../src/features/profile/validation";
const values = {
  firstName: "Test",
  lastName: "User",
  emailId: "test@example.invalid",
  primary: "0123456789",
  secondary: "",
};
const user = {
  _id: "test-id",
  firstName: "Test",
  lastName: "User",
  emailId: "test@example.invalid",
};
describe("profile mutation input", () => {
  test("requires ten digit phone and accepts blank alternate", () => {
    expect(profileSchema.safeParse(values).success).toBe(true);
    expect(profileSchema.safeParse({ ...values, primary: "123" }).success).toBe(
      false,
    );
    expect(
      profileSchema.safeParse({ ...values, secondary: "wrong" }).success,
    ).toBe(false);
  });
  test("does not invent country codes or session token", () => {
    expect(profileInput(values, user)).toEqual({
      _id: "test-id",
      firstName: "Test",
      lastName: "User",
      emailId: "test@example.invalid",
      phoneNo: { number: "0123456789" },
      alternateNo: { number: "" },
    });
  });
});
