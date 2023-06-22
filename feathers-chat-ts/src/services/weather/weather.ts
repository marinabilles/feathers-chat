// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html
import { authenticate } from '@feathersjs/authentication'

import { hooks as schemaHooks } from '@feathersjs/schema'

import {
  weatherDataValidator,
  weatherQueryValidator,
  weatherResolver,
  weatherExternalResolver,
  weatherDataResolver,
  weatherQueryResolver
} from './weather.schema'

import type { Application } from '../../declarations'
import { WeatherService, getOptions } from './weather.class'
import { weatherPath, weatherMethods } from './weather.shared'

export * from './weather.class'
export * from './weather.schema'

// A configure function that registers the service and its hooks via `app.configure`
export const weather = (app: Application) => {
  // Register our service on the Feathers application
  app.use(weatherPath, new WeatherService(getOptions(app)), {
    // A list of all methods this service exposes externally
    methods: weatherMethods,
    // You can add additional custom events to be sent to clients here
    events: []
  })
  // Initialize hooks
  app.service(weatherPath).hooks({
    around: {
      all: [
        authenticate('jwt'),
        schemaHooks.resolveExternal(weatherExternalResolver),
        schemaHooks.resolveResult(weatherResolver)
      ]
    },
    before: {
      all: [schemaHooks.validateQuery(weatherQueryValidator), schemaHooks.resolveQuery(weatherQueryResolver)],
      create: [schemaHooks.validateData(weatherDataValidator), schemaHooks.resolveData(weatherDataResolver)],
    },
    after: {
      all: []
    },
    error: {
      all: []
    }
  })
}

// Add this service to the service type index
declare module '../../declarations' {
  interface ServiceTypes {
    [weatherPath]: WeatherService
  }
}
