export default async function ProductDetails({
  params,
}: {
  params: Promise<{ productID: string }>;
}) {
  const productID = (await params).productID;
  return <h1>Details about product {productID}</h1>;
}
