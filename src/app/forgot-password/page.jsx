import ForgotPasswordForm from "@/app/components/ForgotPasswordForm";

export const metadata = {
  title: "Reset your password",
  description: "Recover access to your Inventory System account.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: false },
};


// Recover existing accounts or route unknown email addresses to account creation.
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
