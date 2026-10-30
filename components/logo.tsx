import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  showTagline?: boolean;
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}

export function ElvoraLogo({ showTagline = false, className = "", href = "/", size = "md" }: LogoProps) {
  const dimensions = {
    sm: { width: 120, height: 32, textClass: "text-base", taglineClass: "text-[10px]" },
    md: { width: 140, height: 38, textClass: "text-lg", taglineClass: "text-xs" },
    lg: { width: 180, height: 48, textClass: "text-2xl", taglineClass: "text-sm" },
  }[size];

  const content = (
    <div className={`flex flex-col items-start ${className}`}>
      <div className="flex items-center gap-2">
        <Image
          src="/elvora-logo.png"
          alt="Elvora"
          width={dimensions.width}
          height={dimensions.height}
          priority
          className="h-7 sm:h-8 w-auto object-contain"
        />
      </div>
      {showTagline && (
        <span className={`font-medium tracking-tight text-slate-500 mt-0.5 select-none ${dimensions.taglineClass}`}>
          Simpler Business. Smarter Growth.
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
