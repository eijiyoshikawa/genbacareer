import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { ProfileForm } from "./profile-form"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "プロフィール編集",
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      prefecture: true,
      city: true,
      birthDate: true,
      desiredCategories: true,
      desiredSalaryMin: true,
      profilePublic: true,
      jobSearchStatus: true,
    },
  })

  if (!user) redirect("/login")

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">プロフィール編集</h1>
      <div className="mt-6">
        <ProfileForm
          initialData={{
            name: user.name ?? "",
            phone: user.phone ?? "",
            prefecture: user.prefecture ?? "",
            city: user.city ?? "",
            birthDate: user.birthDate
              ? user.birthDate.toISOString().split("T")[0]
              : "",
            desiredCategories: user.desiredCategories,
            desiredSalaryMin: user.desiredSalaryMin?.toString() ?? "",
            profilePublic: user.profilePublic,
            jobSearchStatus: user.jobSearchStatus,
          }}
        />
      </div>
    </div>
  )
}
