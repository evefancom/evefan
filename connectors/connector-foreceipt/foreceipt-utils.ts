import {objectFromArray} from '@openint/util'

export const _parseAccounts = (
  connData: {_id: string},
  settings: Array<{
    type: 'ACCOUNT' | 'CATEGORY'
    json: Foreceipt.UserSettingJson
  }>,
) => {
  const accountSettings = settings.find((s) => s.type === 'ACCOUNT')?.json as
    | Foreceipt.UserSettingAccount
    | undefined
  return (
    accountSettings?.accounts.map((a) => ({
      _id: `${connData._id}-${a.id}` as ExternalId,
      data: a,
    })) ?? []
  )
}

function _parseCategories(
  settings: Array<{
    type: 'ACCOUNT' | 'CATEGORY'
    json: Foreceipt.UserSettingJson
  }>,
) {
  const categorySetting = settings.find((s) => s.type === 'CATEGORY')?.json as
    | Foreceipt.UserSettingCategory
    | undefined
  const categoryNameById: Record<string, string> = {}

  for (const category of categorySetting?.categories ?? []) {
    for (const subCategory of category.sub_categories ?? []) {
      categoryNameById[`${category.id}/${subCategory.id}`] = [
        category.name,
        subCategory.name,
      ].join('/')
    }
    categoryNameById[`${category.id}`] = category.name
  }

  return categoryNameById
}

export function _parseResourceInfo(
  userAndTeam: Omit<Foreceipt._ResourceOld, 'credentials'>,
  settings: Array<{
    type: 'ACCOUNT' | 'CATEGORY'
    json: Foreceipt.UserSettingJson
  }>,
) {
  const memberByGuid = objectFromArray(
    userAndTeam.teamMembers ?? [],
    (m) => m.user_guid,
  )

  const categoryNameById = _parseCategories(settings)

  return {
    ...userAndTeam,
    settings,
    memberByGuid,
    categoryNameById,
  }
}
