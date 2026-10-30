import { z } from "zod";
import type { User } from "../../lib/contracts";
export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  emailId: z.string().trim().email("Enter a valid email address"),
  primary: z.string().regex(/^\d{10}$/, "Enter a valid 10-digit phone number"),
  secondary: z
    .string()
    .refine(
      (v) => v === "" || /^\d{10}$/.test(v),
      "Enter a valid 10-digit phone number",
    ),
});
export type ProfileValues = z.infer<typeof profileSchema>;
export const profileDefaults = (user: User): ProfileValues => ({
  firstName: user.firstName,
  lastName: user.lastName,
  emailId: user.emailId,
  primary: user.phoneNo?.number ?? "",
  secondary: user.alternateNo?.number ?? "",
});
export function profileInput(values: ProfileValues, user: User) {
  return {
    _id: user._id,
    firstName: values.firstName,
    lastName: values.lastName,
    emailId: values.emailId,
    phoneNo: {
      number: values.primary,
      ...(user.phoneNo?.countryCode
        ? { countryCode: user.phoneNo.countryCode }
        : {}),
    },
    alternateNo: {
      number: values.secondary,
      ...(user.alternateNo?.countryCode
        ? { countryCode: user.alternateNo.countryCode }
        : {}),
    },
  };
}
