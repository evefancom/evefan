import type {HTTPError} from '@openint/util'
import {createHTTPClient, startCase, z, zCast, zFunction} from '@openint/util'

export const zConfig = z.object({
  appId: z.string(),
  secret: z.string(),
  url: z.string().nullish(),
})

export const makeSaltedgeClient = zFunction(zConfig, (config) => {
  const http = createHTTPClient({
    baseURL: config.url ?? 'https://www.saltedge.com/api/v5',
    headers: {
      'cache-control': 'no-cache',
      'Content-Type': 'application/json',
      'App-id': config.appId,
      Secret: config.secret,
    },
    errorTransformer: (err) => {
      if (err?.response?.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
        return new SaltEdgeError(err.response.data as any, err)
      }
      return err
    },
  })
  async function listCategories() {
    return http
      .get<{data: SaltEdge.Categories}>('/categories')
      .then((r) => r.data.data)
  }

  const listTransactions = zFunction(
    zCast<SaltEdge.ListTransactionsParams>(),
    async (params) =>
      http
        .get<SaltEdge.ListTransactionsResponse>('/transactions', {params})
        .then((r) => r.data),
  )
  async function* iterateAllTransactions(
    params: Omit<SaltEdge.ListTransactionsParams, 'from_id'>,
  ) {
    let fromId: string | undefined
    while (true) {
      const res = await listTransactions({
        ...params,
        from_id: fromId,
        per_page: 1000,
      })
      if (res.data.length === 0) {
        break
      }
      yield res.data
      if (res.meta.next_id == null) {
        break
      } else {
        fromId = res.meta.next_id
      }
    }
  }

  const listAccounts = zFunction(
    zCast<SaltEdge.ListAccountsParams>(),
    async (params) =>
      http
        .get<SaltEdge.ListAccountsResponse>('/accounts', {params})
        .then((r) => r.data),
  )
  async function* iterateAllAccounts(
    params: Omit<SaltEdge.ListAccountsParams, 'from_id'>,
  ) {
    let fromId: string | undefined
    while (true) {
      const res = await listAccounts({
        ...params,
        from_id: fromId,
        per_page: 1000,
      })
      if (res.data.length === 0) {
        break
      }
      yield res.data
      if (res.meta.next_id == null) {
        break
      } else {
        fromId = res.meta.next_id
      }
    }
  }

  return {
    listCategories,
    CACHED_CATEGORIES_MAP,
    getCategoriesMap: zFunction(async () => {
      const res = await listCategories()
      const ret: Record<keyof typeof res, Record<string, string>> = {
        personal: {},
        business: {},
      }
      // https://www.saltedge.com/clients/tickets/2402466 Ignore biz categories for now
      for (const [perOrBiz, _categories] of Object.entries(res)) {
        const categories = _categories as (typeof res)[keyof typeof res]
        const map = ret[perOrBiz as keyof typeof res]
        for (const [category, subCategories] of Object.entries(categories)) {
          for (const subCategory of subCategories) {
            if (map[subCategory]) {
              console.warn('Duplicate SubCategory found.', map[subCategory])
            }
            map[subCategory] = [category, subCategory].map(startCase).join('/')
          }
        }
      }
      return ret
    }),
    createCustomer: zFunction(
      zCast<SaltEdge.CreateCustomerParams>(),
      async (params) =>
        http
          .post<{data: SaltEdge.Customer}>('/customers', {data: params})
          .then((r) => r.data.data),
    ),
    showCustomer: zFunction(z.string(), async (id) =>
      http
        .get<{data: SaltEdge.Customer}>(`/customers/${id}`)
        .then((r) => r.data.data),
    ),
    listCustomers: zFunction(
      z.object({identifier: z.string().nullish()}),
      async (params) =>
        http
          .get<SaltEdge.ListCustomersResponse>('/customers', {params})
          .then((r) => r.data),
    ),
    listConnections: zFunction(
      z.object({customer_id: z.string()}),
      async (params) =>
        http
          .get<SaltEdge.ListConnectionsResponse>('/connections', {params})
          .then((r) => r.data),
    ),

    showConnection: zFunction(z.object({id: z.string()}), async (params) =>
      http
        .get<{data: SaltEdge.Connection}>(`/connections/${params.id}`)
        .then((r) => r.data.data),
    ),
    createConnectSession: zFunction(
      zCast<SaltEdge.CreateConnectSessionParams>(),
      async (params) =>
        http
          .post<{data: SaltEdge.ConnectSession}>('/connect_sessions/create', {
            // HACK: Get around saltedge-cli parsing ID to a number
            data: {...params, customer_id: String(params.customer_id)},
          })
          .then((r) => r.data.data),
    ),
    reconnect: zFunction(
      zCast<SaltEdge.ReconnectConnectionParams>(),
      async (params) =>
        http
          .post<{data: SaltEdge.ConnectSession}>(
            '/connect_sessions/reconnect',
            {
              data: params,
            },
          )
          .then((r) => r.data.data),
    ),

    refreshConnection: zFunction(
      z.object({
        id: z.string(),
        attempt: zCast<SaltEdge.Attempt>().nullish(),
        daily_refresh: z.boolean().nullish(),
        include_fake_providers: z.boolean().nullish(),
        categorization: z.union([
          z.literal('none'),
          z.literal('personal'),
          z.literal('business'),
        ]),
      }),
      async ({id, ...data}) =>
        http
          .put<{data: SaltEdge.Connection}>(`/connections/${id}/refresh`, {
            data,
          })
          .then((r) => r.data.data),
    ),
    listAccounts,
    listTransactions,
    iterateAllTransactions,
    iterateAllAccounts,
  }
})

/**
 * @see https://docs.saltedge.com/account_information/v5/#errors
 */
export class SaltEdgeError extends Error {
  override name = 'SaltEdgeError'

  constructor(
    public readonly data: {
      error: {
        class: string // 'ConnectionNotFound'
        message: string // "Connection with id: '111111111111111111' was not found."
        documentation_url: string // 'https://docs.saltedge.com/account_information/v5/#errors-connection_not_found'
        request_id: string // '313b4518-10d4-4c15-a18e-34ddd583ebdf'
      }
      request: {
        connection_id: string // '111111111111111111'
      }
    },
    public readonly originalError: HTTPError,
  ) {
    super(
      data.error
        ? `[${data.error.class}] ${data.error.message}`
        : originalError.message,
    )
    Object.setPrototypeOf(this, SaltEdgeError.prototype)
  }
}

export const CACHED_CATEGORIES_MAP: Record<
  keyof SaltEdge.Categories,
  Record<string, string>
> = {
  personal: {
    car_rental: 'Auto And Transport/Car Rental',
    gas_and_fuel: 'Auto And Transport/Gas And Fuel',
    parking: 'Auto And Transport/Parking',
    public_transportation: 'Auto And Transport/Public Transportation',
    service_and_parts: 'Auto And Transport/Service And Parts',
    taxi: 'Auto And Transport/Taxi',
    internet: 'Bills And Utilities/Internet',
    phone: 'Bills And Utilities/Phone',
    television: 'Bills And Utilities/Television',
    utilities: 'Bills And Utilities/Utilities',
    advertising: 'Business Services/Advertising',
    office_supplies: 'Business Services/Office Supplies',
    shipping: 'Business Services/Shipping',
    books_and_supplies: 'Education/Books And Supplies',
    student_loan: 'Education/Student Loan',
    tuition: 'Education/Tuition',
    amusement: 'Entertainment/Amusement',
    arts: 'Entertainment/Arts',
    games: 'Entertainment/Games',
    movies_and_music: 'Entertainment/Movies And Music',
    newspapers_and_magazines: 'Entertainment/Newspapers And Magazines',
    provider_fee: 'Fees And Charges/Provider Fee',
    loans: 'Fees And Charges/Loans',
    service_fee: 'Fees And Charges/Service Fee',
    taxes: 'Fees And Charges/Taxes',
    alcohol_and_bars: 'Food And Dining/Alcohol And Bars',
    cafes_and_restaurants: 'Food And Dining/Cafes And Restaurants',
    groceries: 'Food And Dining/Groceries',
    charity: 'Gifts And Donations/Charity',
    gifts: 'Gifts And Donations/Gifts',
    doctor: 'Health And Fitness/Doctor',
    personal_care: 'Health And Fitness/Personal Care',
    pharmacy: 'Health And Fitness/Pharmacy',
    sports: 'Health And Fitness/Sports',
    wellness: 'Health And Fitness/Wellness',
    home_improvement: 'Home/Home Improvement',
    home_services: 'Home/Home Services',
    home_supplies: 'Home/Home Supplies',
    mortgage: 'Home/Mortgage',
    rent: 'Home/Rent',
    bonus: 'Income/Bonus',
    investment_income: 'Income/Investment Income',
    paycheck: 'Income/Paycheck',
    car_insurance: 'Insurance/Car Insurance',
    health_insurance: 'Insurance/Health Insurance',
    life_insurance: 'Insurance/Life Insurance',
    property_insurance: 'Insurance/Property Insurance',
    allowance: 'Kids/Allowance',
    babysitter_and_daycare: 'Kids/Babysitter And Daycare',
    baby_supplies: 'Kids/Baby Supplies',
    child_support: 'Kids/Child Support',
    kids_activities: 'Kids/Kids Activities',
    toys: 'Kids/Toys',
    pet_food_and_supplies: 'Pets/Pet Food And Supplies',
    pet_grooming: 'Pets/Pet Grooming',
    veterinary: 'Pets/Veterinary',
    clothing: 'Shopping/Clothing',
    electronics_and_software: 'Shopping/Electronics And Software',
    sporting_goods: 'Shopping/Sporting Goods',
    hotel: 'Travel/Hotel',
    transportation: 'Travel/Transportation',
    vacation: 'Travel/Vacation',
  },
  business: {
    merchandise: 'Cost Of Goods/Merchandise',
    raw_materials: 'Cost Of Goods/Raw Materials',
    dividends: 'Financials/Dividends',
    donations: 'Financials/Donations',
    fees: 'Financials/Fees',
    fines: 'Financials/Fines',
    interest: 'Financials/Interest',
    bonus: 'Human Resources/Bonus',
    education_and_trainings: 'Human Resources/Education And Trainings',
    social_security: 'Human Resources/Social Security',
    staff_outsourcing: 'Human Resources/Staff Outsourcing',
    wages: 'Human Resources/Wages',
    investment: 'Income/Investment',
    returns: 'Income/Returns',
    sales: 'Income/Sales',
    business_insurance: 'Insurance/Business Insurance',
    equipment_insurance: 'Insurance/Equipment Insurance',
    health_insurance: 'Insurance/Health Insurance',
    liability_insurance: 'Insurance/Liability Insurance',
    professional_insurance: 'Insurance/Professional Insurance',
    equipment: 'Office/Equipment',
    office_rent: 'Office/Office Rent',
    office_supplies: 'Office/Office Supplies',
    software: 'Office/Software',
    accounting: 'Services/Accounting',
    consultancy: 'Services/Consultancy',
    contractors: 'Services/Contractors',
    legal: 'Services/Legal',
    marketing: 'Services/Marketing',
    online_subscriptions: 'Services/Online Subscriptions',
    storage: 'Services/Storage',
    duty_taxes: 'Taxes/Duty Taxes',
    federal_taxes: 'Taxes/Federal Taxes',
    income_taxes: 'Taxes/Income Taxes',
    property_taxes: 'Taxes/Property Taxes',
    tax_return: 'Taxes/Tax Return',
    vat: 'Taxes/Vat',
    gas_and_fuel: 'Transport/Gas And Fuel',
    leasing: 'Transport/Leasing',
    shipping: 'Transport/Shipping',
    taxi: 'Transport/Taxi',
    electricity: 'Utilities/Electricity',
    gas: 'Utilities/Gas',
    internet: 'Utilities/Internet',
    phone: 'Utilities/Phone',
    water: 'Utilities/Water',
  },
}
