import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { dayjs } from '../lib/dayjs';
import { ClientError } from '../errors/client-error';

export async function getActivities(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/trips/:tripId/activities', {
    schema: {
      params: z.object({
        tripId: z.string().uuid(),
      }),
    },
  } , async (request) => {
    const { tripId } = request.params;

    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        activities: {
          orderBy: {
            date: 'asc',
          },
        }
      },
    });

    if (!trip) {
      throw new ClientError('Trip not found');
    }

    const differenceInDaysBetweenTripStartandEnd = dayjs(trip.endsAt).diff(dayjs(trip.startsAt), 'days');

    const activities = Array.from({ length: differenceInDaysBetweenTripStartandEnd + 1 }).map((_, index) => {
      const date = dayjs(trip.startsAt).add(index, 'days');

      return {
        date: date.toDate(),
        activities: trip.activities.filter((activity) => {
          return dayjs(activity.date).isSame(date, 'day');
        }, []),
      };
    });
    return {activities};
  });
}