import Link from 'next/link';

export function EventPagination({ currentPage, totalPages, basePath, t }) {
  if (totalPages <= 1) {
    return null;
  }

  const prevHref = currentPage > 1 ? `${basePath}?page=${currentPage - 1}` : null;
  const nextHref = currentPage < totalPages ? `${basePath}?page=${currentPage + 1}` : null;

  return (
    <div className="mt-8 flex items-center justify-between text-sm text-zinc-400">
      {prevHref ? (
        <Link href={prevHref} className="market-button-secondary">{t.events.previous}</Link>
      ) : (
        <span />
      )}
      <span>{t.events.page} {currentPage} {t.events.of} {totalPages}</span>
      {nextHref ? (
        <Link href={nextHref} className="market-button-secondary">{t.events.next}</Link>
      ) : (
        <span />
      )}
    </div>
  );
}
