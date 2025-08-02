import { notFound } from "next/navigation";

export default async function ProductReviews({
  params,
}: {
  params: Promise<{ productID: string; reviewID: string }>;
}) {
  const { productID, reviewID } = await params;
  if (parseInt(reviewID) > 1000) {
    notFound();
  }
  return (
    <h1>
      Review {reviewID} for product {productID}
    </h1>
  );
}
