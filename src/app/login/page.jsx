import AuthForm from "@/app/components/AuthForm";

// Use the shared login design and allow only local post-login redirect paths.
export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const candidate = typeof params?.next === "string" ? params.next : "/";
  const redirectPath = candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/";

  return <AuthForm mode="login" redirectPath={redirectPath} />;
}
