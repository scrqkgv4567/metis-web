import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("max-w-7xl mx-auto p-4 sm:p-6 lg:p-8", className)}
      {...props}
    />
  )
)
PageContainer.displayName = "PageContainer"

export default PageContainer
