import { NewVerificationForm } from "@/components/auth/new-verification-form";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Подтверждение Email",
    description: "Подтвердите ваш email адрес",
}

const NewVerificationPage = () => {
    return (
        <div className="container flex h-screen w-screen flex-col items-center justify-center">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                <div className="flex flex-col space-y-2 text-center">
                    <NewVerificationForm />
                </div>
            </div>
        </div>
    );
};

export default NewVerificationPage;
