import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
    password: string,
    hashedPassword: string
): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
    if (password.length < 8) {
        return { valid: false, error: "Пароль должен содержать минимум 8 символов" };
    }
    if (!/[A-Z]/.test(password) && !/[a-z]/.test(password)) {
        return { valid: false, error: "Пароль должен содержать буквы" };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, error: "Пароль должен содержать цифры" };
    }
    return { valid: true };
}
