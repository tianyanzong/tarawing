import Image from 'next/image';
import horizontalLogo from '@/app/assets/images/logo-horizontal.webp';
import squareLogo from '@/app/assets/images/square_icon.webp';
import circularLogo from '@/app/assets/images/round_icon.webp';

export type BrandLogoVariant = 'horizontal' | 'square' | 'circular';

const LOGOS = {
  horizontal: {
    src: horizontalLogo,
    alt: 'Tarawing',
    sizes: '(max-width: 340px) calc(100vw - 40px), (max-width: 760px) 289px, 356px',
    quality: 90,
  },
  square: {
    src: squareLogo,
    alt: 'Tarawing Admin',
    sizes: '56px',
    quality: 85,
  },
  circular: {
    src: circularLogo,
    alt: 'Tarawing workspace',
    sizes: '72px',
    quality: 85,
  },
} satisfies Record<BrandLogoVariant, {
  src: typeof horizontalLogo;
  alt: string;
  sizes: string;
  quality: number;
}>;

interface BrandLogoProps {
  variant: BrandLogoVariant;
  className?: string;
  priority?: boolean;
  alt?: string;
}

export default function BrandLogo({
  variant,
  className = '',
  priority = false,
  alt,
}: BrandLogoProps) {
  const logo = LOGOS[variant];

  return (
    <Image
      src={logo.src}
      alt={alt ?? logo.alt}
      sizes={logo.sizes}
      quality={logo.quality}
      priority={priority}
      className={`brand-logo brand-logo--${variant}${className ? ` ${className}` : ''}`}
    />
  );
}
