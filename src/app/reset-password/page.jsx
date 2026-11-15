import ResetPasswordForm from "@/app/components/ResetPasswordForm";

export const metadata = {
  title: "Choose a new password",
  description: "Set a new password for your Inventory System account.",
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: false },
};


// Pass the email OTP flow parameters to the reset UI; legacy emailed tokens remain supported.
export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  const token = typeof params?.token === "string" ? params.token : "";
  const email = typeof params?.email === "string" ? params.email : "";

  return <ResetPasswordForm token={token} email={email} />;
}
