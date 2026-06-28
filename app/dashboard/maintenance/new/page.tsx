import MaintenanceForm from '../maintenance-form'

interface SearchParams {
  storeId?: string
}

export default async function NewMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const storeId = params.storeId || ''

  return <MaintenanceForm storeId={storeId} />
}
