import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Button } from "@/components/ui/button";

export const metadata = constructMetadata({
    title: "Reels Generation – SaaS Starter",
    description: "Create AI-generated reels.",
});

export default function ReelsPage() {
    return (
        <>
            <DashboardHeader
                heading="Генерация Рилс"
                text="Создавайте вирусные короткие видео с помощью AI."
            />
            <EmptyPlaceholder>
                <EmptyPlaceholder.Icon name="reels" />
                <EmptyPlaceholder.Title>Нет созданных рилс</EmptyPlaceholder.Title>
                <EmptyPlaceholder.Description>
                    Вы еще не создали ни одного рилс. Начните прямо сейчас!
                </EmptyPlaceholder.Description>
                <Button>Создать Рилс</Button>
            </EmptyPlaceholder>
        </>
    );
}
