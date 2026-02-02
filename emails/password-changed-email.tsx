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
        <Body style={{ backgroundColor: "#F5F5F4", margin: 0, padding: 0 }}>
            <Container style={{ maxWidth: "520px", margin: "0 auto", padding: "40px 20px" }}>
                {/* Header */}
                <Section style={{ textAlign: "center", marginBottom: "32px" }}>
                    <Text style={{
                        fontSize: "24px",
                        fontWeight: "600",
                        color: "#1A1A1A",
                        margin: 0,
                        letterSpacing: "-0.02em"
                    }}>
                        {siteName}
                    </Text>
                    <Text style={{
                        fontSize: "14px",
                        color: "#6B6B6B",
                        margin: "8px 0 0 0"
                    }}>
                        AI-платформа для создателей контента
                    </Text>
                </Section>

                {/* Card */}
                <Section style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "32px",
                    border: "1px solid #E5E5E5"
                }}>
                    <Text style={{
                        fontSize: "18px",
                        fontWeight: "500",
                        color: "#1A1A1A",
                        margin: "0 0 24px 0"
                    }}>
                        Привет, {firstName}
                    </Text>

                    {/* Success Box */}
                    <Section style={{
                        backgroundColor: "#F0FDF4",
                        borderRadius: "10px",
                        padding: "16px",
                        border: "1px solid #BBF7D0"
                    }}>
                        <Text style={{
                            fontSize: "15px",
                            color: "#166534",
                            fontWeight: "500",
                            margin: 0
                        }}>
                            Пароль успешно изменён
                        </Text>
                        {changedAt && (
                            <Text style={{
                                fontSize: "13px",
                                color: "#15803D",
                                margin: "8px 0 0 0"
                            }}>
                                {changedAt}
                            </Text>
                        )}
                    </Section>

                    <Text style={{
                        fontSize: "15px",
                        color: "#525252",
                        lineHeight: "1.6",
                        margin: "24px 0 0 0"
                    }}>
                        Если это были вы — всё в порядке, никаких действий не требуется.
                    </Text>

                    {/* Warning Box */}
                    <Section style={{
                        backgroundColor: "#FEF2F2",
                        borderRadius: "10px",
                        padding: "16px",
                        marginTop: "24px",
                        border: "1px solid #FECACA"
                    }}>
                        <Text style={{
                            fontSize: "14px",
                            color: "#991B1B",
                            fontWeight: "500",
                            margin: "0 0 8px 0"
                        }}>
                            Это были не вы?
                        </Text>
                        <Text style={{
                            fontSize: "13px",
                            color: "#B91C1C",
                            margin: 0,
                            lineHeight: "1.5"
                        }}>
                            Немедленно сбросьте пароль через страницу «Забыли пароль?» или свяжитесь с поддержкой.
                        </Text>
                    </Section>
                </Section>

                <Hr style={{ borderColor: "#E5E5E5", margin: "32px 0" }} />

                {/* Footer */}
                <Section style={{ textAlign: "center" }}>
                    <Text style={{
                        fontSize: "12px",
                        color: "#A3A3A3",
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
