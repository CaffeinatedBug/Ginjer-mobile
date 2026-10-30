import { z } from "zod";
import { request } from "../../../lib/graphql";
import { userSchema, type User } from "../../../lib/contracts";
import { profileInput, type ProfileValues } from "../validation";
export const UPDATE_PROFILE =
  "mutation UpdateUserProfile($editUserInput: EditUserInput!) { updateUserProfile(editUserInput: $editUserInput) { _id firstName lastName emailId defaultAccount organisationId phoneNo { countryCode number } alternateNo { countryCode number } image { key location } } }";
export async function saveProfile(values: ProfileValues, user: User) {
  return (
    await request(
      UPDATE_PROFILE,
      { editUserInput: profileInput(values, user) },
      z.object({ updateUserProfile: userSchema }),
      { mutation: true },
    )
  ).updateUserProfile;
}
