import * as z from "zod";

export const locationsSchema = z.array(
  z.object({
    name: z.string(),
    airQuality: z.object({
      stationName: z.string(),
    }),
    weather: z.object({
      nx: z.number(),
      ny: z.number(),
    }),
  }),
);
export type Locations = z.infer<typeof locationsSchema>;

export const busStationsSchema = z.array(
  z.object({
    name: z.string(),
    stId: z.string(),
    buses: z.array(
      z.object({
        name: z.string(),
        busRouteId: z.string(),
        ord: z.string(),
        style: z
          .object({
            bg: z.string(),
            text: z.string(),
          })
          .optional(),
      }),
    ),
  }),
);
export type BusStations = z.infer<typeof busStationsSchema>;

export const calendarsSchema = z.array(
  z.object({
    id: z.email(),
    name: z.string(),
    style: z
      .object({
        bg: z.string(),
        text: z.string(),
      })
      .optional(),
  }),
);
export type Calendars = z.infer<typeof calendarsSchema>;

export const loadSettings = (): {
  locations: Locations;
  busStations: BusStations;
  calendars: Calendars;
} => ({
  locations: process.env.LOCATIONS ? locationsSchema.parse(process.env.LOCATIONS) : [],
  busStations: process.env.BUS_STATIONS ? busStationsSchema.parse(process.env.BUS_STATIONS) : [],
  calendars: process.env.CALENDARS ? calendarsSchema.parse(process.env.CALENDARS) : [],
});
