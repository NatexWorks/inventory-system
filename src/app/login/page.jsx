import AuthForm from "@/app/components/AuthForm";

export const metadata = {
  title: "Log in",
  description: "Sign in to your private Inventory System workspace.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};


// Use the shared login design and allow only local post-login redirect paths.
export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const candidate = typeof params?.next === "string" ? params.next : "/dashboard";
  const redirectPath = candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/";

  return <AuthForm mode="login" redirectPath={redirectPath} />;
}
