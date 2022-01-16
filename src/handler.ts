import { Router } from 'itty-router'
import { NoaaSpcStore, Outlook } from '@mjohnsey/weather.js'
import * as _ from 'lodash'

export const router = Router()

// export async function handleRequest(request: Request): Promise<Response> {
//   // const lat = _.toNumber(request.cf.latitude)
//   // const lng = _.toNumber(request.cf.longitude)
//   // const location = request.cf.city || 'Home'
//   // const foo = NoaaSpcStore.checkAllForecasts(lat, lng)
//   // return new Response(`${JSON.stringify({result: foo})}`)
// }

const proxyGet = async (url: string, request: Request) => {
  const reqUrl = new URL(request.url)
  const newRequest = new Request(url)
  newRequest.headers.set('Origin', 'https://www.spc.noaa.gov')
  let response = await fetch(newRequest)
  response = new Response(response.body, response)
  response.headers.set('Access-Control-Allow-Origin', '*')
  // response.headers.set('')
  response.headers.append('Vary', 'Origin')
  return response
}

const MAX_DAYS_OUT = 2

const getOutlooks = (maxDaysOut = MAX_DAYS_OUT) => {
  const outlooks = Outlook.getOutlooks()
  const filteredOutlooks = _.filter(outlooks, (outlook) => {
    return outlook.day <= maxDaysOut
  })
  return filteredOutlooks
}

router.get('/', async () => {
  return new Response(`${JSON.stringify({ result: 'OK' })}`)
})

router.get('/outlooks', async () => {
  const filteredOutlooks = getOutlooks()
  const result = _.map(filteredOutlooks, (outlook) => {
    return {
      day: outlook.day,
      geojsonUrl: outlook.geometryUrl(),
      outLookType: outlook.outlookType.toString(),
      id: outlook.id(),
    }
  })
  return new Response(`${JSON.stringify(result)}`)
})

router.get('/forecasts', async () => {
  const result: any = {}
  const outlooks = getOutlooks()
  _.forEach(outlooks, (outlook) => {
    result[outlook.name()] = {}
  })
  return new Response(`${JSON.stringify(result)}`)
})

router.get('/apiKey', async () => {
  const key = await SPC_CHECK.get('API_KEY')
  return new Response(`${JSON.stringify({ key })}`)
})

router.get('/proxiedFetch/:id', async ({ params }) => {
  const safeParams = params === undefined ? {} : _.clone(params)
  const id = safeParams.id || ''
  if (id === '') {
    return new Response(`${JSON.stringify({ result: 'No id provided' })}`)
  }
  const outlooks = Outlook.getOutlooks()
  const outlook = _.find(outlooks, (outlook) => {
    return outlook.id() === id
  })
  if (outlook === undefined) {
    return new Response(`${JSON.stringify({ result: 'No outlook found' })}`)
  }
  const url = outlook.geometryUrl()
  return proxyGet(url, new Request(url))
})

router.all('*', () => new Response('Not found!', { status: 404 }))
