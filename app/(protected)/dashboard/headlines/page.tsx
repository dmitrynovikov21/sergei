import { constructMetadata } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/header";
import { EmptyPlaceholder } from "@/components/shared/empty-placeholder";
import { Button } from "@/components/ui/button";

export const metadata = constructMetadata({
    title: "Headlines Generation – SaaS Starter",
    description: "Generate catchy headlines.",
});

export default function HeadlinesPage() {
    return (
        <>
            <DashboardHeader
                heading="Генерация Заголовков"
                text="Создавайте кликбейтные и продающие заголовки."
            />
            <EmptyPlaceholder>
                <EmptyPlaceholder.Icon name="headlines" />
                <EmptyPlaceholder.Title>Нет сохраненных заголовков</EmptyPlaceholder.Title>
                <EmptyPlaceholder.Description>
                    Сгенерируйте и сохраните лучшие заголовки для ваших постов.
                </EmptyPlaceholder.Description>
                <Button>Сгенерировать</Button>
            </EmptyPlaceholder>
        </>
    );
}
