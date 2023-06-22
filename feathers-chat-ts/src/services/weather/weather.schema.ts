// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { resolve } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import type { Static } from '@feathersjs/typebox'

import type { HookContext } from '../../declarations'
import { dataValidator, queryValidator } from '../../validators'

// Main data model schema
export const weatherSchema = Type.Object(
  {
    latitude: Type.Number(),
    longitude: Type.Number()
  },
  { $id: 'Weather', additionalProperties: false }
)
export type Weather = Static<typeof weatherSchema>
export const weatherValidator = getValidator(weatherSchema, dataValidator)
export const weatherResolver = resolve<Weather, HookContext>({})

export const weatherExternalResolver = resolve<Weather, HookContext>({})

// Schema for creating new entries
export const weatherDataSchema = Type.Pick(weatherSchema, ['latitude', 'longitude'])
export type WeatherData = Static<typeof weatherDataSchema>
export const weatherDataValidator = weatherValidator
export const weatherDataResolver = resolve<Weather, HookContext>({})

// Schema for allowed query properties
export const weatherQueryProperties = Type.Pick(weatherSchema, ['latitude', 'longitude'])
export const weatherQuerySchema = Type.Intersect(
  [
    querySyntax(weatherQueryProperties),
    // Add additional query properties here
    Type.Object({}, { additionalProperties: false })
  ],
  { additionalProperties: false }
)
export type WeatherQuery = Static<typeof weatherQuerySchema>
export const weatherQueryValidator = getValidator(weatherQuerySchema, queryValidator)
export const weatherQueryResolver = resolve<WeatherQuery, HookContext>({})
