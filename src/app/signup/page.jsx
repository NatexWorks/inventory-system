import AuthForm from "@/app/components/AuthForm";

// Keep signup visually consistent with login by using the shared reference form.
export default async function SignupPage({ searchParams }) {
  const params = await searchParams;
  const candidate = typeof params?.next === "string" ? params.next : "/";
  const redirectPath = candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/";

  return <AuthForm mode="signup" redirectPath={redirectPath} />;
}
