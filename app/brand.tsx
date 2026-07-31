import Image from "next/image";
import Link from "next/link";

type BrandProps = {
  compact?: boolean;
  href?: string;
};

/**
 * Shared ESO Addon Workshop identity used across the catalog and addon pages.
 */
export default function Brand({ compact = false, href = "/" }: BrandProps) {
  return (
    <Link className={`brand${compact ? " brand-compact" : ""}`} href={href}>
      <Image
        className="brand-mark"
        src="/brand-mark.svg"
        alt=""
        width={180}
        height={64}
        priority
      />
      <span className="brand-copy">
        <small>ESO</small>
        <strong>Addon Workshop</strong>
      </span>
    </Link>
  );
}
