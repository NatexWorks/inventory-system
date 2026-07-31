import { redirect } from "next/navigation";

// Login route now redirects to the public homepage.
export default async function LoginPage({ searchParams }) {
  await searchParams;
  redirect("/");
}
