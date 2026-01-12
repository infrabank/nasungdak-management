import OilChangeForm from '../oil-change-form'

interface SearchParams {
  storeId?: string
}

export default async function NewOilChangePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const storeId = params.storeId || ''

  return <OilChangeForm storeId={storeId} />
}