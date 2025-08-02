'use client';

import { usePathname } from "next/navigation";

export default function NotFound() {
    const pathname = usePathname();
    const productID = pathname.split('/')[2];
    const reviewID = pathname.split('/')[4];
  return (
    <>
      <h1>Review {reviewID} not found for product {productID} </h1>
    </>
  );
}
