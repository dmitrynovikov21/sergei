import {
    Body,
    Button,
    Container,
    Head,
    Hr,
    Html,
    Preview,
    Section,
    Text,
} from "@react-email/components";

type PasswordResetEmailProps = {
    firstName: string;
    resetLink: string;
    siteName: string;
};

export const PasswordResetEmail = ({
    firstName = "Пользователь",
    resetLink,
    siteName = "Content Zavod",
}: PasswordResetEmailProps) => (
    <Html>
        <Head>
            <style>{`
                body { font-family: 'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            `}</style>
        </Head>
        <Preview>Сброс пароля — {siteName}</Preview>
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
                        margin: "0 0 16px 0"
                    }}>
                        Привет, {firstName}
                    </Text>

                    <Text style={{
                        fontSize: "15px",
                        color: "#525252",
                        lineHeight: "1.6",
                        margin: "0 0 24px 0"
                    }}>
                        Мы получили запрос на сброс пароля для вашего аккаунта. Нажмите кнопку ниже, чтобы создать новый пароль:
                    </Text>

                    {/* CTA Button */}
                    <Section style={{ textAlign: "center", margin: "32px 0" }}>
                        <Button
                            href={resetLink}
                            style={{
                                backgroundColor: "#D97757",
                                color: "#FFFFFF",
                                fontSize: "15px",
                                fontWeight: "600",
                                padding: "14px 28px",
                                borderRadius: "12px",
                                textDecoration: "none",
                                display: "inline-block"
                            }}
                        >
                            Сбросить пароль
                        </Button>
                    </Section>

                    {/* Info */}
                    <Section style={{
                        backgroundColor: "#FAFAFA",
                        borderRadius: "10px",
                        padding: "16px",
                        marginTop: "24px",
                        border: "1px solid #EEEEEE"
                    }}>
                        <Text style={{
                            fontSize: "13px",
                            color: "#737373",
                            margin: 0,
                            lineHeight: "1.5"
                        }}>
                            Ссылка действительна 1 час. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.
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

export default PasswordResetEmail;
