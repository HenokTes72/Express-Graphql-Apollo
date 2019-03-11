import uuidv4 from 'uuid/v4';

 export default {
    Query: {
      users: (parent, args, { models }) => {
        return Object.values(models.users);
      },
      me: (parent, args, { me }) => {
        return me;
      },
      user: (parent, { id }, { models } ) => {
        return models.users[id];
      },
      messages: (parent, args, { models }) => {
        return Object.values(models.messages)
      },
      message: (parent, { id }, { models }) => {
        return models.messages[id];
      }
    },
  
    User: {
      messages: (user, args, { models }) => {
        return Object.values(models.messages).filter(
          message => message.userId === user.id,
        );
      }
    }
  };