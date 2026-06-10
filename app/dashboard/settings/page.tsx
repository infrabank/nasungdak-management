import { redirect } from 'next/navigation'
import { getOrganizationSettings } from './actions'
import GeneralForm from './general-form'
import BrandingForm from './branding-form'

export default async function SettingsPage() {
  const settings = await getOrganizationSettings()

  if (!settings) {
    redirect('/login')
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-brutal-black">조직 설정</h1>
          <p className="mt-2 text-sm text-brutal-black/70">
            {settings.organization.name} 조직의 설정을 관리합니다
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {/* General Settings */}
        <section className="border-3 border-brutal-black bg-brutal-white">
          <div className="border-b-2 border-brutal-black bg-brutal-yellow/20 px-6 py-4">
            <h2 className="text-lg font-bold text-brutal-black">기본 정보</h2>
          </div>
          <div className="p-6">
            <GeneralForm
              organization={settings.organization}
              isOwner={settings.isOwner}
            />
          </div>
        </section>

        {/* Branding */}
        <section className="border-3 border-brutal-black bg-brutal-white">
          <div className="border-b-2 border-brutal-black bg-brutal-yellow/20 px-6 py-4">
            <h2 className="text-lg font-bold text-brutal-black">브랜딩</h2>
            <p className="mt-1 text-sm text-brutal-black/60">
              헤더에 표시될 로고를 설정합니다
            </p>
          </div>
          <div className="p-6">
            <BrandingForm
              organization={{
                id: settings.organization.id,
                name: settings.organization.name,
                logoUrl: settings.organization.logoUrl,
              }}
              isOwner={settings.isOwner}
            />
          </div>
        </section>

        {/* 구독/결제 및 팀 멤버 섹션은 단일 매장 운영 집중을 위해 숨김 처리함 (SaaS 동결) */}
      </div>
    </div>
  )
}
