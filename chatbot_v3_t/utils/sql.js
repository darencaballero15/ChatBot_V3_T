
function fn_exec_procedure(store, proc, data) {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await store.execProcedure(proc, data);
      resolve(response.data.body)
    }
    catch (err) {
      reject(err)
    }
  })
}

function fn_exec_procedurePlane(store, proc, data) {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await store.execProcedurePlane(proc, data);
      resolve(response.data.body)
    }
    catch (err) {
      reject(err)
    }
  })
}

function fn_exec_function(store, func, data) {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await store.execFunction(func, data);
      resolve(response.data.body)
    }
    catch (err) {
      reject(err)
    }
  })
}

function fn_exec_functionPlane(store, func, data) {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await store.execFunctionPlane(func, data);
      resolve(response.data.body)
    }
    catch (err) {
      reject(err)
    }
  })
}

function execSql(store, sql) {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await store.execQuery({ sql });
      resolve(response.data.body)
    }
    catch (err) {
      reject(err)
    }
  })
}


function execSqlReturning(store, sql, data) {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await store.execQueryReturning({ sql, data });
      resolve(response.data.body)
    }
    catch (err) {
      reject(err)
    }
  })
}

module.exports = {
  fn_exec_procedure,
  fn_exec_procedurePlane,
  fn_exec_function,
  fn_exec_functionPlane,
  execSql,
  execSqlReturning
}