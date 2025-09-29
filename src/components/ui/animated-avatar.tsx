import * as React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, TrendingUp, Award, Zap } from "lucide-react"

interface AnimatedAvatarProps {
  src?: string | null
  alt?: string
  fallback?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  className?: string
  showStatus?: boolean
  status?: "online" | "busy" | "offline"
  performanceScore?: number
  showPerformanceRing?: boolean
  celebration?: boolean
  pulse?: boolean
  animationLevel?: "subtle" | "normal" | "fun"
  color?: string
  style?: "initials" | "photo" | "generated"
  onClick?: () => void
}

const sizeClasses = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20"
}

const fontSizeClasses = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl"
}

const statusColors = {
  online: "hsl(var(--success))",
  busy: "hsl(var(--warning))",
  offline: "hsl(var(--muted-foreground))"
}

// Generate a consistent color based on string input
function generateColor(input: string): string {
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ]
  
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

// Generate initials from a name
function getInitials(name?: string): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function AnimatedAvatar({
  src,
  alt,
  fallback,
  size = "md",
  className,
  showStatus = false,
  status = "offline",
  performanceScore = 0,
  showPerformanceRing = false,
  celebration = false,
  pulse = false,
  animationLevel = "normal",
  color,
  style = "initials",
  onClick
}: AnimatedAvatarProps) {
  const autoColor = color || generateColor(fallback || "default")
  const initials = getInitials(fallback)
  
  const hoverScale = animationLevel === "subtle" ? 1.05 : animationLevel === "fun" ? 1.15 : 1.1
  const hoverRotate = animationLevel === "fun" ? 5 : 0
  
  // Calculate ring dimensions
  const ringSize = {
    xs: 28,
    sm: 36,
    md: 44,
    lg: 60,
    xl: 84
  }[size]
  
  const strokeWidth = size === "xs" ? 2 : size === "sm" ? 2 : 3
  const radius = (ringSize - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (performanceScore / 100) * circumference

  return (
    <motion.div
      className={cn("relative inline-block", className)}
      whileHover={animationLevel !== "subtle" ? {
        scale: hoverScale,
        rotate: hoverRotate,
      } : {}}
      animate={pulse ? {
        scale: [1, 1.05, 1],
      } : {}}
      transition={pulse ? {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      } : {
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {/* Performance Ring */}
      {showPerformanceRing && (
        <svg
          className="absolute inset-0 -rotate-90"
          width={ringSize}
          height={ringSize}
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-90deg)"
          }}
        >
          {/* Background ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress ring */}
          <motion.circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke={
              performanceScore >= 80 
                ? "hsl(var(--success))"
                : performanceScore >= 50
                ? "hsl(var(--warning))" 
                : "hsl(var(--destructive))"
            }
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeInOut" }}
            style={{
              strokeDasharray: circumference,
            }}
          />
        </svg>
      )}

      {/* Main Avatar */}
      <Avatar className={cn(sizeClasses[size], "border-2 border-background")}>
        {src && style === "photo" ? (
          <AvatarImage src={src} alt={alt} />
        ) : null}
        <AvatarFallback
          className={cn(
            fontSizeClasses[size],
            "font-semibold transition-all",
            !src && "animate-in fade-in-50 zoom-in-95"
          )}
          style={{
            backgroundColor: style === "initials" ? autoColor : undefined,
            color: style === "initials" ? "white" : undefined
          }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Status Indicator */}
      {showStatus && (
        <motion.div
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-background",
            size === "xs" ? "h-2 w-2" : size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"
          )}
          style={{ backgroundColor: statusColors[status] }}
          animate={status === "online" ? {
            scale: [1, 1.2, 1],
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Celebration Effect */}
      <AnimatePresence>
        {celebration && (
          <>
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute"
                initial={{
                  opacity: 0,
                  scale: 0,
                  x: 0,
                  y: 0
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  x: [0, (Math.random() - 0.5) * 60],
                  y: [0, -30 - Math.random() * 30]
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
                style={{
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)"
                }}
              >
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Achievement Badges */}
      {performanceScore >= 100 && showPerformanceRing && (
        <motion.div
          className="absolute -top-1 -right-1"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          <Award className="h-4 w-4 text-yellow-500" />
        </motion.div>
      )}
    </motion.div>
  )
}