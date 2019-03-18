import { ForbiddenError } from 'apollo-server';
import { combineResolvers } from 'graphql-resolvers';
import Sequelize from 'sequelize';

import pubsub, { EVENTS } from '../subscription';
import { isAuthenticated, isMessageOwner } from './authorization';
import { cursorTo } from 'readline';

const toCursorHash = string => Buffer.from(string).toString('base64');

const fromCursorHash = string =>
  Buffer.from(string, 'base64').toString('ascii');
 
export default {
  Query: {
    messages: async (parent, { cursor, limit = 100 }, { models }) => {
      const cursorOptions = cursor 
        ? {
            where: {
              createdAt: {
                [Sequelize.Op.lt]: fromCursorHash(cursor),
              },
            },
          }
          : {};
        const messages = await models.Message.findAll({
          order: [['createdAt', 'DESC']],
          limit: limit + 1,
          ...cursorOptions,
        });

        const hasNextPage = messages.length > limit;
        const edges = hasNextPage ? messages.slice(0, -1) : messages;

        return {
          edges,
          pageInfo: {
            hasNextPage,
            endCursor: toCursorHash(
              edges[edges.length - 1].createdAt.toString(),
            ),
          },
        };
    },
    message: async (parent, { id }, { models }) => {
      return await models.Message.findById(id);
    }
  },

  Mutation: {
    createMessage: combineResolvers(
      isAuthenticated,
      async (parent, { text }, { me, models }) => {
        const message = await models.Message.create({
          text,
          userId: me.id
        });

        // console.log("On the way to publish: ", message);
        pubsub.publish(EVENTS.MESSAGE.CREATED, {
          // console.log("help needed");
          messageCreated: { message },
        });

        return message;
      },
    ),

      //option 2, throwing an error in the resolver, so that the
      // apollo server converts into a valid error message

      // try { 
      //   return await models.Message.create({
      //     text,
      //     userId: me.id
      //   });
      // }
      // catch(error) {
      //   throw new Error("You can't pass an empty string for the text field")
      // }
    

    deleteMessage: combineResolvers(
      isAuthenticated,
      isMessageOwner,
      async (parent, { id }, { models }) => {
        return await models.Message.destroy({ where: { id } })
      },
    ),  

    
    updateMessage: async (parent, { id, text }, { models }) => {
      return await models.Message.update(
        {
          text
        },
        {
          where: { id }
        }
      );
    },
  },

  Message: {
    user: async (message, args, { loaders }) => {  
      return await loaders.user.load(message.userId);
    }
  },

  Subscription: {
    messageCreated: {
      subscribe: () => pubsub.asyncIterator(EVENTS.MESSAGE.CREATED),
    },
  },
};