import type { Combo } from "@/lib/catalog";
import { Jar } from "./Jar";

// Jars of a combo grouped on one shelf. Six-jar hampers stagger into two rows.
// The combo's own photo when it has one, otherwise the jars.
export function ComboArt({ combo, className }: { combo: Combo; className?: string }) {
  const products = combo.items;
  const photo = combo.images[0];

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- already resized to 400/800 px WebP by catalog-service
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes="(min-width: 1024px) 33vw, 50vw"
        alt={photo.alt}
        className={`object-cover ${className ?? ""}`}
        loading="lazy"
      />
    );
  }

  if (products.length > 3) {
    const back = products.slice(0, 3);
    const front = products.slice(3);
    return (
      <div className={`relative ${className ?? ""}`} aria-hidden>
        <div className="absolute inset-x-[13%] bottom-[30%] flex justify-center -space-x-[3%]">
          {back.map((p) => (
            <Jar key={p.slug} fill={p.fill} fillDeep={p.fillDeep} texture={p.texture} level={0.8} className="w-[36%]" />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center -space-x-[3%]">
          {front.map((p) => (
            <Jar key={p.slug} fill={p.fill} fillDeep={p.fillDeep} texture={p.texture} level={0.86} className="w-[34%]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end justify-center ${className ?? ""}`} aria-hidden>
      {products.map((p, i) => (
        <Jar
          key={p.slug}
          fill={p.fill}
          fillDeep={p.fillDeep}
          texture={p.texture}
          level={0.86}
          className={i === 1 ? "relative z-10 -mx-[7%] w-[44%]" : "w-[38%]"}
        />
      ))}
    </div>
  );
}
