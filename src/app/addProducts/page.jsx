import { Suspense } from "react";
import AddProductClient from "./AddProductClient";

// Server component wrapper that resolves the query string and renders the client form.
export default async function AddProductPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const id = resolvedSearchParams?.id;

  return (
    <Suspense fallback={<div className="container">Loading product form...</div>}>
      <AddProductClient id={id} />
    </Suspense>
  );
}
