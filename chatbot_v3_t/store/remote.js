
function createRemoteDB(user, password,host,port,database,maxpool) {
  const USER = user;
  const PASSWORD = password;
  const HOST = host;
  const PORT = port;
  const DATABASE = database;
  const MAXPOOL = maxpool;
  
  function get() {
    let store = [];
    return store = [USER, PASSWORD, HOST,PORT,DATABASE,MAXPOOL];
  }
  
  return {
    get,
  };
}

module.exports = createRemoteDB;
