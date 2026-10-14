import AuthForm from "@/app/components/AuthForm";

// Keep signup visually consistent with login by using the shared reference form.
export default async function SignupPage({ searchParams }) {
  const params = await searchParams;
  const candidate = typeof params?.next === "string" ? params.next : "/";
  const redirectPath = candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/";
  const initialEmail = typeof params?.email === "string" ? params.email : "";
  const initialMessage = params?.notice === "account-not-found"
    ? "No account was found for this email. Create your account and verify your email address."
    : "";

  return (
    <AuthForm
      mode="signup"
      redirectPath={redirectPath}
      initialEmail={initialEmail}
      initialMessage={initialMessage}
    />
  );
}
