import ResetPasswordForm from "@/app/components/ResetPasswordForm";

// Pass the email OTP flow parameters to the reset UI; legacy emailed tokens remain supported.
export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";
  const email = typeof params?.email === "string" ? params.email : "";

  return <ResetPasswordForm token={token} email={email} />;
}
