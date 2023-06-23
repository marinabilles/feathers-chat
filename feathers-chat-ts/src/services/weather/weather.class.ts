// For more information about this file see https://dove.feathersjs.com/guides/cli/service.class.html#custom-services
import type { Id, NullableId, Params, ServiceInterface } from '@feathersjs/feathers'

import type { Application } from '../../declarations'
import type { Weather, WeatherData, WeatherQuery } from './weather.schema'

import axios from 'axios'

export type { Weather, WeatherData, WeatherQuery }

export interface WeatherServiceOptions {
  app: Application
}

export interface WeatherParams extends Params<WeatherQuery> {}

// This is a skeleton for a custom service class. Remove or add the methods you need here
export class WeatherService<ServiceParams extends WeatherParams = WeatherParams>
  implements ServiceInterface<Weather, WeatherData, ServiceParams>
{
  constructor(public options: WeatherServiceOptions) {}

  async create(data: WeatherData, params?: ServiceParams): Promise<Weather>
  async create(data: WeatherData[], params?: ServiceParams): Promise<Weather[]>
  async create(data: WeatherData | WeatherData[], params?: ServiceParams): Promise<Weather | Weather[]> {
    if (Array.isArray(data)) {
      return Promise.all(data.map((current) => this.create(current, params)))
    }

    const meteos = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: data.latitude,
        longitude: data.longitude,
        hourly: "temperature_2m"
      }
    })

    let currentDate = new Date(meteos.data.hourly.time[0])
    const dates = [currentDate]
    const currentTemperatures: number[] = []
    const meanTemperatures: number[] = []
    for (let i: number = 0; i < meteos.data.hourly.time.length; i++) {
      let date = new Date(meteos.data.hourly.time[i])
      if (currentDate.getDate() !== date.getDate()) {
        currentDate = date
        dates.push(currentDate)
        const meanTemperature = currentTemperatures.reduce((sum, curr) => sum + curr, 0) /
            currentTemperatures.length
        meanTemperatures.push(meanTemperature)
        currentTemperatures.length = 0
      }

      currentTemperatures.push(meteos.data.hourly.temperature_2m[i])
    }

    const meanTemperature = currentTemperatures.reduce((sum, curr) => sum + curr, 0) /
    currentTemperatures.length
    meanTemperatures.push(meanTemperature)

    return {
      ...meteos.data,
      dates: dates,
      meanTemperatures: meanTemperatures
    }
  }
}

export const getOptions = (app: Application) => {
  return { app }
}
