import { redirect } from "next/navigation";

// Signup route reuses the same auth form but switches it into signup mode.
export default async function SignupPage({ searchParams }) {
  await searchParams;
  redirect("/");
}
