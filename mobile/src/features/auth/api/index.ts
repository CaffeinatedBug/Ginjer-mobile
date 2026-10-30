import { z } from "zod";
import { request } from "../../../lib/graphql";
import type { SignUpValues } from "../validation";
export const SIGN_UP =
  "mutation SignUp($user: SignUpInput!) { signUp(user: $user) { _id firstName lastName emailId } }";
const result = z.object({
  signUp: z.object({
    _id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    emailId: z.string(),
  }),
});
export async function signUp(values: SignUpValues) {
  const { firstName, lastName, emailId, password } = values;
  return (
    await request(
      SIGN_UP,
      {
        user: { firstName, lastName, emailId, password, application: "Ginjer" },
      },
      result,
      { mutation: true, authenticated: false },
    )
  ).signUp;
}
