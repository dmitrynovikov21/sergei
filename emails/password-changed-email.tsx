import {
    Body,
    Container,
    Head,
    Hr,
    Html,
    Preview,
    Section,
    Text,
} from "@react-email/components";

type PasswordChangedEmailProps = {
    firstName: string;
    siteName: string;
    changedAt?: string;
};

export const PasswordChangedEmail = ({
    firstName = "Пользователь",
    siteName = "Content Zavod",
    changedAt,
}: PasswordChangedEmailProps) => (
    <Html>
        <Head>
            <style>{`
                body { font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            `}</style>
        </Head>
        <Preview>Пароль успешно изменён — {siteName}</Preview>
        <Body style={{ backgroundColor: "#0A0A0A", margin: 0, padding: 0 }}>
            <Container style={{ maxWidth: "520px", margin: "0 auto", padding: "40px 20px" }}>
                {/* Header */}
                <Section style={{ textAlign: "center", marginBottom: "32px" }}>
                    <Text style={{
                        fontSize: "24px",
                        fontWeight: "600",
                        color: "#FFFFFF",
                        margin: 0,
                        letterSpacing: "-0.02em"
                    }}>
                        {siteName}
                    </Text>
                    <Text style={{
                        fontSize: "14px",
                        color: "#A3A3A3",
                        margin: "8px 0 0 0"
                    }}>
                        AI-платформа для создателей контента
                    </Text>
                </Section>

                {/* Card */}
                <Section style={{
                    backgroundColor: "#18181B",
                    borderRadius: "16px",
                    padding: "32px",
                    border: "1px solid #27272A"
                }}>
                    <Text style={{
                        fontSize: "18px",
                        fontWeight: "500",
                        color: "#FFFFFF",
                        margin: "0 0 24px 0"
                    }}>
                        Привет, {firstName}
                    </Text>

                    {/* Success Box */}
                    <Section style={{
                        backgroundColor: "#052E16",
                        borderRadius: "10px",
                        padding: "16px",
                        border: "1px solid #166534"
                    }}>
                        <Text style={{
                            fontSize: "15px",
                            color: "#22C55E",
                            fontWeight: "500",
                            margin: 0
                        }}>
                            ✓ Пароль успешно изменён
                        </Text>
                        {changedAt && (
                            <Text style={{
                                fontSize: "13px",
                                color: "#4ADE80",
                                margin: "8px 0 0 0"
                            }}>
                                {changedAt}
                            </Text>
                        )}
                    </Section>

                    <Text style={{
                        fontSize: "15px",
                        color: "#A3A3A3",
                        lineHeight: "1.6",
                        margin: "24px 0 0 0"
                    }}>
                        Если это были вы — всё в порядке, никаких действий не требуется.
                    </Text>

                    {/* Warning Box */}
                    <Section style={{
                        backgroundColor: "#450A0A",
                        borderRadius: "10px",
                        padding: "16px",
                        marginTop: "24px",
                        border: "1px solid #7F1D1D"
                    }}>
                        <Text style={{
                            fontSize: "14px",
                            color: "#FCA5A5",
                            fontWeight: "500",
                            margin: "0 0 8px 0"
                        }}>
                            Это были не вы?
                        </Text>
                        <Text style={{
                            fontSize: "13px",
                            color: "#F87171",
                            margin: 0,
                            lineHeight: "1.5"
                        }}>
                            Немедленно сбросьте пароль через страницу «Забыли пароль?» или свяжитесь с поддержкой.
                        </Text>
                    </Section>
                </Section>

                <Hr style={{ borderColor: "#27272A", margin: "32px 0" }} />

                {/* Footer */}
                <Section style={{ textAlign: "center" }}>
                    <Text style={{
                        fontSize: "12px",
                        color: "#52525B",
                        margin: 0
                    }}>
                        © 2025 {siteName}. Все права защищены.
                    </Text>
                </Section>
            </Container>
        </Body>
    </Html>
);

export default PasswordChangedEmail;
