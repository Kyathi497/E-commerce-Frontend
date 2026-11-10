"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ProductEditor } from "@/components/admin/product-editor";
import { Loading } from "@/components/admin/ui";

export default function EditProductPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EditProduct />
    </Suspense>
  );
}

function EditProduct() {
  const id = useSearchParams().get("id");
  // key: a different product always gets a fresh editor.
  return <ProductEditor key={id ?? "none"} id={id} />;
}
