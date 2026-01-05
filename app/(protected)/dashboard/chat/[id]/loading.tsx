import { Skeleton } from "@/components/ui/skeleton"
import { HeaderUpdater } from "@/components/dashboard/header-context"

export default function Loading() {
    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#F9FAFB] dark:bg-[#0f0f0f]">
            {/* Show Header Skeleton */}
            <HeaderUpdater
                title=""
                description=""
                isLoading={true} // Add isLoading prop support to HeaderUpdater or just show empty
                icon={<Skeleton className="h-6 w-6 rounded-full" />}
            />

            <div className="flex-1 overflow-y-auto px-4 py-8">
                <div className="mx-auto max-w-3xl space-y-8">
                    {/* Message Skeletons */}
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <div className={`flex items-start gap-3 ${i % 2 === 0 ? "flex-row-reverse" : "flex-row"}`}>
                                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                <div className={`flex flex-col gap-1 max-w-[80%] ${i % 2 === 0 ? "items-end" : "items-start"}`}>
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className={`h-16 w-full rounded-2xl ${i % 2 === 0 ? "rounded-tr-sm" : "rounded-tl-sm"}`} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Input Skeleton */}
            <div className="p-4 bg-[#F9FAFB] dark:bg-[#0f0f0f]">
                <div className="mx-auto max-w-3xl">
                    <Skeleton className="h-14 w-full rounded-3xl" />
                </div>
            </div>
        </div>
    )
}
