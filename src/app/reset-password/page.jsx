import ResetPasswordForm from "@/app/components/ResetPasswordForm";

// Pass the emailed reset token to the existing password-reset UI.
export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";

  return <ResetPasswordForm token={token} />;
}
