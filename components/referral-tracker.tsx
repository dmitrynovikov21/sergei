'use client'

import { useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { setReferralCookie } from "@/actions/referrals"

export function ReferralTracker() {
    const searchParams = useSearchParams()

    useEffect(() => {
        const ref = searchParams.get("ref")
        if (ref) {
            setReferralCookie(ref)
        }
    }, [searchParams])

    return null
}
