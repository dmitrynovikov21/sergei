import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Button } from "@/components/ui/button";

export const metadata = constructMetadata({
    title: "Text Generation – SaaS Starter",
    description: "Generate high-quality texts.",
});

export default function TextsPage() {
    return (
        <>
            <DashboardHeader
                heading="Генерация Текстов"
                text="Пишите посты, статьи и описания с помощью AI."
            />
            <EmptyPlaceholder>
                <EmptyPlaceholder.Icon name="post" />
                <EmptyPlaceholder.Title>Нет сохраненных текстов</EmptyPlaceholder.Title>
                <EmptyPlaceholder.Description>
                    Начните писать, и ваши черновики появятся здесь.
                </EmptyPlaceholder.Description>
                <Button>Написать текст</Button>
            </EmptyPlaceholder>
        </>
    );
}
