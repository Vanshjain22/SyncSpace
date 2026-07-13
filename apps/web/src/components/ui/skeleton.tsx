import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Skeleton loading placeholder with shimmer animation.
 * Use for content loading states to maintain layout stability.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn("skeleton animate-pulse rounded-md bg-muted", className)} {...props} />;
}
