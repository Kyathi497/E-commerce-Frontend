import { getProduct } from "@/lib/catalog";
import { getCatalogOrNull } from "@/lib/catalog-data";
import { Jar } from "./Jar";

// A product's illustrated jar in its catalog colours, for decoration.
// Renders nothing if the product isn't on sale. Use inside <Suspense>.
export async function CatalogJar({ slug, level, className }: { slug: string; level: number; className?: string }) {
  const catalog = await getCatalogOrNull();
  const p = catalog && getProduct(catalog, slug);
  if (!p) return null;
  return <Jar fill={p.fill} fillDeep={p.fillDeep} texture={p.texture} level={level} className={className} />;
}
