import { redirect } from "next/navigation";

// Thin wrapper page that passes the reset token into the form component.
export default async function ResetPasswordPage({ searchParams }) {
  await searchParams;
  redirect("/");
}
