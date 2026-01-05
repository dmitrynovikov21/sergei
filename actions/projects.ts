"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createProject(name: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    if (!name.trim()) throw new Error("Name is required")

    const project = await prisma.project.create({
        data: {
            userId: session.user.id,
            name: name.trim(),
            // Default icon or logic could go here if needed
        },
    })

    revalidatePath("/dashboard")
    return project
}

export async function getUserProjects() {
    const session = await auth()
    if (!session?.user?.id) return []

    const projects = await prisma.project.findMany({
        where: { userId: session.user.id },
        include: {
            _count: {
                select: { chats: true }
            }
        },
        orderBy: { createdAt: "desc" },
    })

    return projects
}

// Alias for compatibility if needed, or just use getUserProjects
export const getProjects = getUserProjects

export async function deleteProject(projectId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Verify ownership
    const project = await prisma.project.findUnique({
        where: { id: projectId },
    })

    if (!project || project.userId !== session.user.id) {
        throw new Error("Unauthorized")
    }

    await prisma.project.delete({
        where: { id: projectId },
    })

    revalidatePath("/dashboard")
    return { success: true }
}

export async function renameProject(projectId: string, newName: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    if (!newName.trim()) throw new Error("Name is required")

    const project = await prisma.project.findUnique({
        where: { id: projectId },
    })

    if (!project || project.userId !== session.user.id) {
        throw new Error("Unauthorized")
    }

    await prisma.project.update({
        where: { id: projectId },
        data: { name: newName.trim() },
    })

    revalidatePath("/dashboard")
    return { success: true }
}
