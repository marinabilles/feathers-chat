// For more information about this file see https://dove.feathersjs.com/guides/cli/service.test.html
import assert from 'assert'
import { app } from '../../../src/app'
import type { Server } from 'http'
import chai, { expect } from 'chai'
import chaiHttp from 'chai-http'
import chaiAsPromised from 'chai-as-promised'
import { User, UserData } from '../../../src/services/users/users'
import { WeatherData } from '../../../src/client'

const port = app.get('port');
chai.use(chaiHttp)
chai.use(chaiAsPromised)

describe('weather service', () => {
  let server: Server

  before(async () => {
    server = await app.listen(port)
  })

  it('registered the service', async () => {
    const service = app.service('weather')

    assert.ok(service, 'Registered the service')
    await app.teardown()
  })

  it('refuses if not authenticated', async () => {
    const weatherData: WeatherData = {
      latitude: 49.8722,
      longitude: 8.652
    }

    const response = await chai.request(server)
        .post("/weather")
        .send(weatherData)

    expect(response).to.have.status(401)
  })
})

describe('weather service (authenticated)', () => {
  let server: Server
  let accessToken: string
  let user: User
  let requester: ChaiHttp.Agent

  before(async () => {
    server = await app.listen(port)
    requester = chai.request(server).keepOpen()

    const userData: UserData = {
      email: 'should@create.com',
      password: 'supersecret'
    }

    user = await app.service('users').create(userData)

    const authData = {
      "strategy": "local",
      ...userData
    }

    const response = await requester
        .post("/authentication")
        .send(authData);

    ({ accessToken } = response.body)
  })

  after(async () => {
    await app.service('users').remove(user!.id)
    await app.teardown()
  })

  it('returns weather object', async () => {
    const weatherData: WeatherData = {
      latitude: 49.8722,
      longitude: 8.652
    }

    const response = await requester
        .post("/weather")
        .send(weatherData)
        .auth(accessToken, {type: 'bearer'})

    expect(response).to.have.status(201)
    const result = response.body
    expect(result.latitude).to.be.closeTo(weatherData.latitude, 0.1)
    expect(result.longitude).to.be.closeTo(weatherData.longitude, 0.1)
    expect(Array.isArray(result.hourly.time)).to.be.true
    expect(Array.isArray(result.hourly.temperature_2m)).to.be.true
    expect(Array.isArray(result.dates)).to.be.true
    expect(Array.isArray(result.meanTemperatures)).to.be.true
    expect(result.dates.length).to.equal(7)
    expect(result.meanTemperatures.length).to.equal(7)
    for (let i: number = 0; i < 7; i++) {
      expect(new Date(result.dates[i]).getDate())
          .to.equal(new Date(result.hourly.time[i * 24]).getDate())
      const slice: number[] = result.hourly.temperature_2m.slice(i * 24, (i + 1) * 24)
      const mean = slice.reduce((sum, curr) => sum + curr, 0) / slice.length
      expect(result.meanTemperatures[i]).to.equal(mean)
    }
  })
})
