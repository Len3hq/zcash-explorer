import React from 'react';
import Image from 'next/image';

interface ZcashLogoProps {
  size?: number;
}

/**
 * Wrapper around the official Zcash logo image.
 *
 * IMPORTANT: Place the provided logo file at `public/zcash-logo.png`.
 */
export default function ZcashLogo({ size = 32 }: ZcashLogoProps) {
  const pixelSize = size ?? 32;

  return (
    <Image
      src="/zcash-logo.png"
      alt="Zcash logo"
      width={pixelSize}
      height={pixelSize}
      style={{ width: pixelSize, height: pixelSize }}
      priority
    />
  );
}
