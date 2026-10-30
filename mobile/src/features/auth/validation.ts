import { z } from "zod";
export const loginSchema = z.object({
  emailId: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export const signUpSchema = loginSchema
  .extend({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });
export type LoginValues = z.infer<typeof loginSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
