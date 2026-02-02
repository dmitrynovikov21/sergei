/**
 * Email utilities
 * TODO: Implement with actual email provider (Resend, SendGrid, etc.)
 */

interface ReferralCommissionEmailParams {
    to: string
    referrerName: string
    amount: number
    referralName: string
}

export async function sendReferralCommissionEmail(params: ReferralCommissionEmailParams): Promise<void> {
    // TODO: Implement email sending
    console.log('[Email] Would send referral commission email:', params)
}
