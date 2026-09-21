import Link from "next/link";

export function Brand({ label = "房客簿首頁" }: { label?: string }) {
  return (
    <Link className="brand" href="/" aria-label={label}>
      <span className="mark" aria-hidden="true">簿</span>房客簿
    </Link>
  );
}
