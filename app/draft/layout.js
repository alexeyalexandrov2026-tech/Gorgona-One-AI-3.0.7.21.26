// Draft previews are for review only: keep them out of search results.
export const metadata = { robots: { index: false, follow: false } };

export default function DraftLayout({ children }) {
  return children;
}
