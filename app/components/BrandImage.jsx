"use client";

export function BrandImage({ src, alt, className }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(event) => {
        event.currentTarget.src = '/images/brands/placeholder.svg';
        event.currentTarget.onerror = null;
      }}
    />
  );
}
