import { MagicLinkEmail } from "@/emails/magic-link-email";
import { PasswordResetEmail } from "@/emails/password-reset-email";
import { PasswordChangedEmail } from "@/emails/password-changed-email";
import { EmailConfig } from "next-auth/providers/email";
import { Resend } from "resend";

import { env } from "@/env.mjs";
import { siteConfig } from "@/config/site";

import { getUserByEmail } from "./user";

export const resend = new Resend(env.RESEND_API_KEY);

export const sendVerificationRequest: EmailConfig["sendVerificationRequest"] =
  async ({ identifier, url, provider }) => {
    const user = await getUserByEmail(identifier);
    if (!user || !user.name) return;

    const userVerified = user?.emailVerified ? true : false;
    const authSubject = userVerified
      ? `Вход в ${siteConfig.name}`
      : "Активируйте ваш аккаунт";

    try {
      console.log('[Email] Sending verification request to:', identifier)
      const { data, error } = await resend.emails.send({
        from: provider.from || env.EMAIL_FROM,
        to: identifier,
        subject: authSubject,
        react: MagicLinkEmail({
          firstName: user?.name as string,
          actionUrl: url,
          mailType: userVerified ? "login" : "register",
          siteName: siteConfig.name,
        }),
        headers: {
          "X-Entity-Ref-ID": new Date().getTime() + "",
        },
      });

      if (error || !data) {
        console.error('[Email] Resend Error:', error)
        throw new Error(error?.message);
      }

      console.log('[Email] Sent successfully:', data)
    } catch (error) {
      console.error('[Email] Failed to send verification email:', error)
      throw new Error("Failed to send verification email.");
    }
  };

export const sendVerificationEmail = async (
  email: string,
  token: string,
  name?: string
) => {
  // Use NEXT_PUBLIC_APP_URL if available, otherwise fallback to NEXTAUTH_URL or localhost
  const domain = env.NEXT_PUBLIC_APP_URL;
  // Use API route instead of page with Server Action (Server Actions are broken after deployments)
  const confirmLink = `${domain}/api/verify-email?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Подтвердите ваш email — Content Zavod",
      react: MagicLinkEmail({
        firstName: name || "Пользователь",
        actionUrl: confirmLink,
        mailType: "register",
        siteName: siteConfig.name,
      }),
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('[Email] Failed to send manual verification email:', error);
    throw new Error("Не удалось отправить письмо подтверждения.");
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string,
  userName?: string
) => {
  const domain = env.NEXT_PUBLIC_APP_URL;
  const resetLink = `${domain}/new-password?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Сброс пароля — Content Zavod",
      react: PasswordResetEmail({
        firstName: userName || "Пользователь",
        resetLink: resetLink,
        siteName: siteConfig.name,
      }),
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log('[Email] Password reset email sent to:', email);
    return data;
  } catch (error) {
    console.error('[Email] Failed to send password reset email:', error);
    throw new Error("Не удалось отправить письмо для сброса пароля.");
  }
};

export const sendPasswordChangedEmail = async (
  email: string,
  userName?: string
) => {
  try {
    const changedAt = new Date().toLocaleString('ru-RU', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Europe/Moscow'
    });

    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Пароль успешно изменён — Content Zavod",
      react: PasswordChangedEmail({
        firstName: userName || "Пользователь",
        siteName: siteConfig.name,
        changedAt: changedAt,
      }),
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log('[Email] Password changed notification sent to:', email);
    return data;
  } catch (error) {
    console.error('[Email] Failed to send password changed email:', error);
    // Don't throw - this is a notification, not critical
  }
};

// Referral Emails

interface ReferralCommissionEmailParams {
  to: string;
  referrerName: string;
  amount: number;
  referralName: string;
}

export const sendReferralCommissionEmail = async (params: ReferralCommissionEmailParams) => {
  const { to, referrerName, amount, referralName } = params;
  const domain = env.NEXT_PUBLIC_APP_URL;

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: `Content Zavod: Вы получили ${amount.toFixed(2)} ₽ от реферала`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a;">Привет, ${referrerName}!</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Отличные новости! Ваш реферал <strong>${referralName}</strong> совершил покупку.
          </p>
          <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Ваша комиссия:</p>
            <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold;">${amount.toFixed(2)} ₽</p>
          </div>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Средства уже зачислены на ваш реферальный баланс. Вы можете вывести их или использовать для оплаты подписки.
          </p>
          <a href="${domain}/referrals" style="display: inline-block; background: #1a1a1a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
            Посмотреть баланс →
          </a>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Продолжайте приглашать друзей и получайте 30% с каждой их покупки!
          </p>
        </div>
      `,
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log('[Email] Referral commission email sent to:', to);
    return data;
  } catch (error) {
    console.error('[Email] Failed to send referral commission email:', error);
    throw error;
  }
};

interface PayoutApprovedEmailParams {
  to: string;
  name: string;
  amount: number;
}

export const sendPayoutApprovedEmail = async (params: PayoutApprovedEmailParams) => {
  const { to, name, amount } = params;

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: `Content Zavod: Выплата ${amount.toFixed(2)} ₽ одобрена`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a;">Привет, ${name}!</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Ваша заявка на вывод средств была одобрена.
          </p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">Сумма выплаты:</p>
            <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: bold; color: #1a1a1a;">${amount.toFixed(2)} ₽</p>
          </div>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Средства будут переведены на указанные вами реквизиты в течение 1-3 рабочих дней.
          </p>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Спасибо, что вы с нами! 🙏
          </p>
        </div>
      `,
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log('[Email] Payout approved email sent to:', to);
    return data;
  } catch (error) {
    console.error('[Email] Failed to send payout approved email:', error);
    throw error;
  }
};

