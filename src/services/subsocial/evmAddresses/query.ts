import { AccountData } from '@/pages/api/evm-addresses'
import { createQuery, poolQuery } from '@/subsocial-query'

import axios from 'axios'

export async function getEvmAddresses(addresses: string[]) {
  const requestedIds = addresses.filter((id) => !!id)
  if (requestedIds.length === 0) return []
  const res = await axios.get(
    '/api/evm-addresses?' + requestedIds.map((n) => `addresses=${n}`).join('&')
  )

  return res.data.data as AccountData[]
}

export async function mutateEvmAddressesCache(address: string) {
  const res = await axios.post('/api/evm-addresses?' + `addresses=${address}`)

  return res.data.data as AccountData[]
}

const getEvmAddress = poolQuery<string, AccountData>({
  multiCall: async (addresses) => {
    if (addresses.length === 0) return []
    return getEvmAddresses(addresses)
  },
  resultMapper: {
    paramToKey: (address) => address,
    resultToKey: (result) => result?.grillAddress ?? '',
  },
})
export const getEvmAddressQuery = createQuery({
  key: 'getEvmAddress',
  fetcher: getEvmAddress,
})
