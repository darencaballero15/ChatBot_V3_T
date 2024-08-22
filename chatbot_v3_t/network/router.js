const chatbot_v3_t = require('../api/components/chatbot_v3_t/network')


const routers = (server) => {
  server.use('/api/chatbot_v3_t/', chatbot_v3_t)
}




module.exports = routers