// Test helper route that creates a sample order payload.
export async function POST() {
  // This placeholder is only for local/test use; never expose demo data in production.
  if (process.env.NODE_ENV === "production") {
    return Response.json({ success: false, message: "Not found" }, { status: 404 });
  }
  const fakeOrder = {
    orderId: "ORD_" + Math.floor(Math.random() * 10000),
    customer: "John Doe",
    items: [
      {
        productId: "P1",
        name: "T-Shirt",
        qty: 2,
        price: 499
      }
    ],
    total: 998,
    status: "created",
    createdAt: new Date().toISOString()
  };

  return Response.json({
    success: true,
    message: "Fake order generated successfully",
    order: fakeOrder
  });
}
