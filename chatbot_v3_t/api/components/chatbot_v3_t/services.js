const moment = require('moment');
moment.locale('es');
const axios  = require('axios');
const { error } = require('../../../network/response');
const { Pool } = require("pg");
const Utilitys = require('../../../utils/Utility')
const { createPool } = require('generic-pool');


function generarID() {
  return new Promise((resolve, reject) => {
    import('nanoid').then(nanoid => {
      const id = generateCustomId();// Genera un ID único
      resolve(id); // Resuelve la promesa con el ID generado
    }).catch(error => {
      reject(error); // Rechaza la promesa con el error si ocurre alguno
    });
  });
}

function generateCustomId() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const alphabet = letters + numbers;

  let id = '';
  for (let i = 0; i < 3; i++) {
    id += letters[Math.floor(Math.random() * letters.length)];
  }

  id += '-';

  for (let i = 0; i < 13; i++) {
    id += numbers[Math.floor(Math.random() * numbers.length)];
  }

  return id.toUpperCase();
}


function validateLoteriasQuery(cadena) {
  const regex = /^(?:\d+,)*\d+$/;

  if (regex.test(cadena)) {
    const simbolosNoValidos = /[^\d,]/g;
    return !simbolosNoValidos.test(cadena);
  } else {

    return false;
  }
}

// logicPG

module.exports = function (injectStore) {
  const store = injectStore;

  const pool = new Pool({
    user: store.get()[0],
    password: store.get()[1],
    host: store.get()[2],
    port: store.get()[3],
    database: store.get()[4],
    max: store.get()[5],
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    acquireTimeoutMillis: 5000,
  });


  const factory = {
    create: () => pool.connect(),
    destroy: client => client.release(),
  };

  const options = {
    max: store.get()[5],
    min: 5,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 5000,
    maxLifetime: 300000, // 5 minutos de tiempo de vida máximo para una conexión
  };

  const advancedPool = createPool(factory, options);


  async function Select_In_Postgre(sql, params = []) {
    let client;

    try {
      // client = await pool.connect();
      client = await advancedPool.acquire();
      const result = await client.query(sql, params);

      return result; // Return only the rows for convenience
    } catch (error) {
      console.error('Error when connecting or querying:', error);
      throw error; // Re-throw the error for proper handling
    } finally {
      if (client) {
        try {
          await advancedPool.release(client);
        } catch (releaseError) {
          console.log('Error releasing connection:', releaseError);
        }
      }
    }
  }

  /*
  async function Select_In_Postgre(sql) {
    try {
      client = await pool.connect();
      const result = await client.query(sql);
      return result;
    } catch (error) {
      console.error('Error when connecting or querying:', error);
      return error;
    } finally {
      if (client) {
        try {
          await client.release();
        } catch (releaseError) {
          console.log('Se intento usar un pool ya cerrado')
        }
      }
    }
  }
*/

  async function Insert_In_Postgre(tabla, datos) {
    let client;
    try {
      client = await advancedPool.acquire();
      const columnas = Object.keys(datos);
      const placeholderArray = columnas.map((_, index) => `$${index + 1}`);
      const query = `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${placeholderArray.join(', ')}) RETURNING *`;
      const result = await client.query(query, Object.values(datos));
      return result;
    } catch (error) {
      if (error.code === '23505') {
        console.error('Infracción de clave duplicada: intentó insertar un registro con una clave única que ya existe.');
      } else {
        console.error('Error inserting data:', error);
      }
      throw error;
    } finally {
      if (client) {
        try {
          await advancedPool.release(client);
        } catch (releaseError) {
          console.log('Error releasing connection:', releaseError);
        }
      }
    }
  }


  /*
    async function Insert_In_Postgre(tabla, datos) {
      let client;
      try {
        client = await pool.connect();
        const columnas = Object.keys(datos);
        const valores = Object.values(datos);
        const query = `INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${valores.map((v, index) => `$${index + 1}`).join(', ')}) RETURNING *`;
        const result = await client.query(query, valores);
        return result.rows;
      } catch (error) {
        if (error.code === '23505') {
          console.error('Se intento insertar doble');
        } else {
          console.error('Error inserting data:', error);
        }
        return error;
      } finally {
        if (client) {
          try {
            client.release();
          } catch (releaseError) {
            console.log('Se intento usar un pool ya cerrado')
          }
        }
      }
    }*/

  function getValidaEmpresa(NumberClient, NumberEmp) {
    return new Promise(async (resolve, reject) => {
      if (NumberClient != 'status@broadcast') {
        let consult, result;
        try {
          consult = `SELECT * from pg_chatbot_empresas WHERE telefono = ${NumberEmp} AND activo = 'S'`;
          result = await Select_In_Postgre(consult);
          if (result.rows.length > 0) {
            resolve(result.rows);
          } else {
            reject(
              `Este bot al que le escribes, no pertenece a ninguna empresa activa o asociada con nosotros 📱🏘️`);
          }
        } catch (err) {
          console.log('getValidaEmpresa_', err)
          reject(err);
        }

      } else {
        console.log('Releasing queued messages..');
        reject('Releasing queued messages..');
      }
    });
  }

  function getValidaClient(NumberClient, NumberEmp) {
    return new Promise(async (resolve, reject) => {
      let consult_client, result_client;
      let consult_post;
      try {
        consult_client = `select * from pg_chatbot_client pcv where telefono = ${NumberClient}  and empresa = ${NumberEmp}`;
        result_client = await Select_In_Postgre(consult_client);
        if (result_client.rows.length > 0) {
          if (result_client.rows[0].activo == 'S') {
            resolve(result_client.rows.concat('SAVED'));
          } else {
            reject(`Lo siento, no puedo proporcionarte información en este momento, ya que actualmente tú no estás *ACTIV@* con nosotros. Por favor, intenta nuevamente. Si el problema persiste, comunícate con el departamento de tecnología. 🖥️🤓`)
          }
        } else {
          consult_post = { telefono: Number(NumberClient), empresa: Number(NumberEmp), activo: 'S', freg: new Date(), saldo: 0 };
          await Insert_In_Postgre('pg_chatbot_client', consult_post);
          consult_client = `select * from pg_chatbot_client pcv where telefono = ${NumberClient}  and empresa = ${NumberEmp}`;
          result_client = await Select_In_Postgre(consult_client);
          resolve(result_client.rows.concat('SAVING'));
        }
      } catch (err) {
        console.log('getValidaClient', err)
        reject(err);
      }
    });
  }

  function SessionsAll() {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `SELECT pcs.id,pcs.telefono,pcs.empresa, pce.indicativo_pais,
        to_char(pcs.freg, 'dd/mm/yy hh24:mi:ss') as fecha_session, 
        to_char(now(), 'dd/mm/yy hh24:mi:ss') as fecha_sistema, 
        CASE 
            WHEN EXTRACT(EPOCH FROM (now() - pcs.freg)) >= 600 THEN 'S' 
            ELSE 'N' 
        END as diferencia
    FROM pg_chatbot_sessions_client pcs, pg_chatbot_empresas pce 
    where pcs.empresa = pce.telefono`;
        result = await Select_In_Postgre(consult);
        if (result.rows.length > 0) {
          resolve(result.rows);
        } else {
          reject('No hay sessiones')
        }
      } catch (err) {
        console.log('SessionsAll', err)
        reject(err);
      }
    });
  }

  async function SaveSession(NumberClient, NumberEmp, Opcion_act) {
    try {
      const consult_get = `SELECT * from pg_chatbot_sessions_client where telefono = ${NumberClient} AND empresa = ${NumberEmp}`;
      const result_get = await Select_In_Postgre(consult_get);

      if (result_get.rows.length == 0) {
        const consult_post = {
          telefono: Number(NumberClient),
          empresa: Number(NumberEmp),
          opcion_act: Number(Opcion_act),
          freg: new Date(),
          temporal: '',
          producto_menu: null,
          data: '',
          temporal_2: '',
          referido: null
        };

        await Insert_In_Postgre('pg_chatbot_sessions_client', consult_post);
        return 'SAVING';
      } else {
        return 'SAVED';
      }
    } catch (err) {
      console.log('SaveSession_', err);
      throw err;
    }
  }



  function ConsultSession(NumberClient, NumberEmp) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `SELECT * from pg_chatbot_sessions_client where telefono = ${NumberClient} AND empresa = ${NumberEmp}`;
        result = await Select_In_Postgre(consult);
        if (result.rows.length > 0) {
          resolve(result.rows);
        } else {
          reject(`😨 No se encontraron datos de su session, por favor intentar nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓`);
        }
      } catch (err) {
        console.log('ConsultSession_', err)
        reject(err);
      }
    });
  }


  function UpdateSession(NumberClient, NumberEmp, temp, opcion_act, producto_menu, data, temp2,referido) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `UPDATE pg_chatbot_sessions_client
        SET opcion_act=${opcion_act}, freg=NOW(), temporal='${temp}', producto_menu=${producto_menu} , data='${data}' , temporal_2='${temp2}', referido=${referido}
        WHERE telefono=${NumberClient} AND empresa = ${NumberEmp}`;
      //  console.log('Update>>>>',consult)
        result = await Select_In_Postgre(consult);
        if (result.rowCount > 0) {
          resolve(result);
        } else {
          //       await client.query('ROLLBACK');
          // reject('Error al realizar el proceso de actualizacion de session.., por favor intentar nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓');
        }
      } catch (err) {
        if (err.includes('Release called on client which has already been released to the pool.')) {
          console.log('Liberación solicitada en el cliente que ya ha sido liberado al grupo.')
        } else {
          console.log('UpdateSession', err)
          reject(err);
        }
      }
    });
  }

  function CloseSession(NumberClient, NumberEmp) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `DELETE FROM pg_chatbot_sessions_client WHERE telefono = ${NumberClient} AND empresa = ${NumberEmp}`;
        result = await Select_In_Postgre(consult);
        resolve('OK CLOSE SESSION');
      } catch (err) {
        console.log('ConsultSession_', err)
        reject(err);
      }
    });
  }


  function ListMenusUsers(NumberEmp) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {

        consult = `SELECT * FROM pg_chatbot_productos WHERE activo = 'S' AND empresa = ${NumberEmp} order by cod_producto`;
        result = await Select_In_Postgre(consult);
        if (result.rows.length > 0) {
          resolve(result.rows);
        } else {
          reject(`No se encontran *PRODUCTOS* activos en este momento, por favor intentalo nuevamente ,si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓`);
        }

      } catch (err) {
        console.log('ListMenusUsers', err)
        reject(err);
      }
    });
  }


  function ListMenusOpcionesUsers(producto, NumberEmp) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        if (producto != 3) {
          consult = `SELECT * FROM pg_chatbot_servicios_productos WHERE cod_producto = ${producto} AND activo = 'S' AND empresa = ${NumberEmp} AND  DATE_TRUNC('day', fecha_sorteo) >= DATE_TRUNC('day', NOW()) order by 1`;
          result = await Select_In_Postgre(consult);
          if (result.rows.length > 0) {
            resolve(result.rows);
          } else {
            reject(`No se encontran *SERVICIOS* activos en este momento, por favor intentalo nuevamente ,si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓`);
          }
        } else {
          consult = `SELECT * FROM pg_chatbot_servicios_productos WHERE cod_producto = ${producto} AND activo = 'S' AND empresa = ${NumberEmp}`;
          result = await Select_In_Postgre(consult);
          if (result.rows.length > 0) {
            resolve(result.rows);
          } else {
            reject(`No se encontran *SERVICIOS* activos en este momento, por favor intentalo nuevamente ,si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓`);
          }
        }

      } catch (err) {
        console.log('ListMenusOpcionesUsers', err)
        reject(err);
      }
    });
  }


  function ConsultInfoRifa(id, NumberEmp) {
    return new Promise(async (resolve, reject) => {
      let consultb, resultb;
      let consult, result;
      let loterias = '';
      try {

        consultb = `select * from pg_chatbot_servicios_productos pcsp where id = ${id}`;
        resultb = await Select_In_Postgre(consultb);
        loterias = resultb.rows[0].cod_loteria.replace("'", "");
        let red = validateLoteriasQuery(loterias)
        if (red) {
          if (resultb.rows.length > 0) {
            consult = `SELECT  s.id, s.nombre, s.descripcion, s.activo, s.activo, s.cod_producto, s.empresa, s.numero_length,  s.valor_apuesta ,
          s.valor_premio,to_char( s.fecha_sorteo,'DD/MM/YYYY') AS fecha_sorteo, l.codigo AS codigo_loteria ,l.nombre as nombre_loteria, l.hora_sorteo, s.tipo_juego , s.min_cantidad_venta, s.tipo_impresion
          FROM pg_chatbot_servicios_productos s, pg_chatbot_loterias l
          WHERE l.codigo in (${resultb.rows[0].cod_loteria.replace("'", "")})
          AND s.id = ${id} AND  s.activo = 'S' AND  s.empresa = ${NumberEmp} AND  DATE_TRUNC('day', s.fecha_sorteo) >= DATE_TRUNC('day', NOW())
          AND l.hora_sorteo >=  CURRENT_TIME ORDER BY l.codigo`;
            result = await Select_In_Postgre(consult);
            if (result.rows.length > 0) {
              resolve(result.rows);
            } else {
              reject(`En este momento, no es posible ingresar en el sorteo, si no deberia ser de esta manera, si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓!`);
            }
          } else {
            reject(`Error al buscar los sorteos... , por favor intentalo nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓`);
          }
        } else {
          reject(`Error en la estructura de loterias... , por favor intentalo nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓`);
        }

      } catch (err) {
        console.log('ConsultInfoRifa', err)
        reject(err);
      }
    });
  }

  function ValidateNumberSorteo(id_rifa) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `SELECT * FROM pg_chatbot_rifas_vendidas where id_rifa = ${id_rifa} and estado_venta = 'N'`;
        result = await Select_In_Postgre(consult);
        if (result.rows.length > 0) {
          resolve(result.rows);
        } else {
          reject(`No se encontraron numeros disponibles para el sorteo...`);
        }
      } catch (err) {
        console.log('ValidateNumberSorteo', err)
        reject(err);
      }
    });
  }


  function ConsultTotalVentaRifa(id_rifa, numero_length) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `SELECT  COUNT(*) AS total_ventas,(COUNT(*) / POWER(10, ${numero_length})) * 100 AS porcentaje_vendido
        FROM pg_chatbot_rifas_vendidas WHERE id_rifa = ${id_rifa} AND estado_venta = 'S'`;
        result = await Select_In_Postgre(consult);
        resolve(result.rows);
      } catch (err) {
        console.log('ConsultTotalVentaRifa', err)
        reject(err);
      }
    });
  }


  function RadomNumberBoletas(id_rifa, limit, empresa) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `SELECT numero_vendido as numero FROM pg_chatbot_rifas_vendidas where id_rifa = ${id_rifa}  and estado_venta = 'N'
      ORDER BY RANDOM() LIMIT ${limit}`;
        //console.log('Testing min >>>>',consult)
        result = await Select_In_Postgre(consult);
        if (result.rows.length > 0) {
          resolve(result.rows);
        } else {
          reject(`No se encontraron numeros disponibles para generar de manera aleatoria...`);
        }
      } catch (err) {
        console.log('RadomNumberBoletas', err)
        reject(err);
      }
    });
  }


  function SaveVentaBoletas(vendedor, cliente, id_rifa, numeros, saldofinal) {
    return new Promise(async (resolve, reject) => {
      let consult1, consult2;
      let result1, result2;
      let resp;
      try {
        const sinComillas = numeros.replace(/'/g, '');
        const arrayNumeros = sinComillas.split(',');
        const resultado = arrayNumeros.join('');
        const nanoid = await generarID().then(id => {
          return id;
        }).catch(error => {
          console.error('Error al generar ID:', error);
          throw error;
        });
        let confechasys = `select to_char(now(),'ddmmyyyyhh24miss') as fecha_sys`;
        resultfechasys = await Select_In_Postgre(confechasys);
        consult1 = `UPDATE public.pg_chatbot_rifas_vendidas
        SET vendido_por=${vendedor}, fecha_venta=NOW(), estado_venta='S', cliente=${cliente} , cifrado = '${nanoid + "" + id_rifa + "" + resultado + "" + vendedor + "" + cliente + "" + resultfechasys.rows[0].fecha_sys}' , nanoid = '${nanoid}'
        WHERE id_rifa=${id_rifa} AND numero_vendido IN(${numeros})`;
        // console.log('Test>>>',consult1)
        result1 = await Select_In_Postgre(consult1);

        consult2 = `UPDATE public.pg_chatbot_client
        SET saldo=${saldofinal}
        WHERE telefono=${cliente}`;
        result2 = await Select_In_Postgre(consult2);

        if (result1.rowCount > 0 && result2.rowCount > 0) {
          resp = await ConsultBoletaIsVenta(id_rifa, numeros, nanoid);
          if (resp.length > 0) {
        //    await client.query('COMMIT');
            resolve(resp);
          } else {
            // await client.query('ROLLBACK');
            reject('Error  al consultar la data del  QR ..., por favor intentar nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓')
          }

        } else {
          //   await client.query('ROLLBACK');
          reject('Error al realizar la venta... 🧧, por favor intentar nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓');
        }

      } catch (err) {
        console.log('SaveVentaBoletas', err)
        //   await client.query('ROLLBACK');
        //  await client.end();
        reject(err);
      }
    });
  }

  function ConsultBoletaIsVenta(id_rifa, numeros, nanoid) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `
        SELECT id,id_rifa,numero_vendido,vendido_por,to_char(fecha_venta, 'dd/mm/yyyy hh24:mi:ss') as fecha_venta,estado_venta,cliente,cifrado,'${nanoid}' as nano
        FROM pg_chatbot_rifas_vendidas where id_rifa = ${id_rifa} and estado_venta = 'S'
        and numero_vendido in(${numeros})`;
        result = await Select_In_Postgre(consult);
        resolve(result.rows);
      } catch (err) {
        console.log('ConsultBoletaIsVenta', err)
        reject(err);
      }
    });
  }

  function ConfigMsnTimbre(id_rifa, empresa) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `SELECT * from pg_chatbot_config_msn_timbre where id_sorteo = ${id_rifa} and empresa = ${empresa} and activo = 'S'`;
        result = await Select_In_Postgre(consult);
        if (result.rows.length > 0) {
          resolve(result.rows);
        } else {
          reject(`No se encontraron mensajes configurados para el timbre con este ID de sorteo : ${id_rifa}...`);
        }
      } catch (err) {
        console.log('ConfigMsnTimbre', err)
        reject(err);
      }
    });
  }


  function getValidaAdmin(NumberClient, NumberEmp) {
    return new Promise(async (resolve, reject) => {
      let consult_get, result_get;
      try {
        consult_get = `SELECT * from pg_chatbot_admin_client where telefono = ${NumberClient} AND empresa = ${NumberEmp} and activo = 'S'`;
        result_get = await Select_In_Postgre(consult_get);
        if (result_get.rows.length > 0) {
          resolve(result_get.rows);
        } else {
          resolve('No es administrador');
        }
      } catch (err) {
        console.log('getValidaAdmin', err)
        reject(err);
      }
    });
  }


  function ConsultRecargarSaldo_ClientAdmin(Cliente, Empresa) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `select id,telefono,empresa,activo,freg,TRIM(REPLACE(to_char(saldo, '$999,999,999,999'), ' ', ''))  as saldo from pg_chatbot_client pcv where telefono = ${Cliente} and empresa = ${Empresa}`;
        result = await Select_In_Postgre(consult);
        if (result.rows.length > 0) {
          if (result.rows[0].activo == 'S') {
            resolve(result.rows);
          } else {
            reject(`Lo siento, no puedo darte informacion de este cliente, ya que actualmente se encuentra *INAACTIV@*, por favor valida e intenta nuevamente`)
          }
        } else {
          reject(`No se encontro informacion disponible de este *CLIENTE*, por favor valida e intenta nuevamente`);
        }
      } catch (err) {
        console.log('ConsultRecargarSaldo_ClientAdmin', err)
        reject(err);
      }
    });
  }

  function RecargarSaldo_ClientAdmin(Administrador, Cliente, NumberEmp, saldo, saldo_new,referido) {
    return new Promise(async (resolve, reject) => {
      let consult_update, result_update;
      let sumsaldo = (Number(saldo) + Number(saldo_new));
      try {
        consult_update = `UPDATE public.pg_chatbot_client
        SET saldo=${sumsaldo}
        WHERE telefono =${Cliente}
        AND empresa = ${NumberEmp}`;
        result_update = await Select_In_Postgre(consult_update);
        if (result_update.rowCount > 0) {
          await Log_Recargas(Administrador, NumberEmp, Cliente, saldo, saldo_new, sumsaldo,referido);
          resolve('OK');
        } else {
          //    await client.query('ROLLBACK');
          reject('Error al actualizar el saldo del cliente..., por favor intentar nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓');
        }
      } catch (err) {
        console.log('RecargarSaldo_ClientAdmin', err)
        reject(err);
      }
    });
  }

  function Log_Recargas(Administrador, NumberEmp, Cliente, Saldo_ant, Saldo_nue, Valor_recarga,referido) {
    return new Promise(async (resolve, reject) => {
      let consult_post;
      try {
        consult_post = { administrador: Number(Administrador), freg: new Date(), empresa: Number(NumberEmp), cliente: Number(Cliente), saldo_anterior: Number(Saldo_ant), saldo_nuevo: Number(Saldo_nue), valor_recarga: Number(Valor_recarga), referido : referido};
        await Insert_In_Postgre('pg_chatbot_log_recargas_client', consult_post);
        resolve('SAVING');
      } catch (err) {
        console.log('Log_Recargas', err)
        reject(err);
      }
    });
  }


  function ConsultaValidaReferido(referido, NumberEmp) {
    return new Promise(async (resolve, reject) => {
      let consult_get, result_get;
      try {
        consult_get = `SELECT * from pg_chatbot_vendedores where  info = '${referido}' and clave = '*'`;
        result_get = await Select_In_Postgre(consult_get);
        if (result_get.rows.length > 0) {
          if (result_get.rows[0].activo == 'S') {
            //console.log('GG>>>',result_get.rows)
            resolve(result_get.rows);
          } else {
            reject(`Lo siento, pero este *REFERIDO* se encuentra inactivo con nosotros...`)
          }
        } else {
          reject('No es un  *REFERIDO* registrado con nosotros, por faovr validar e intentar nuevamnete...');
        }
      } catch (err) {
        console.log('ConsultaValidaReferido', err)
        reject(err);
      }
    });
  }

  function ConsultaIntervalReferido() {
    return new Promise(async (resolve, reject) => {
      let consult_get, result_get;
      try {
        consult_get = `SELECT * from pg_chatbot_vendedores where  clave = '*' and activo = 'S`;
        result_get = await Select_In_Postgre(consult_get);
            resolve(result_get.rows);
      } catch (err) {
        console.log('ConsultaIntervalReferido', err)
        reject(err);
      }
    });
  }



  function ConsultMensajeriaClient(id_mensaje, empresa) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `
        SELECT * FROM pg_chatbot_mensajeria_client where id = ${id_mensaje} and empresa = ${empresa} and activo = 'S'`;
        result = await Select_In_Postgre(consult);
        resolve(result.rows);
      } catch (err) {
        console.log('ConsultMensajeriaClient', err)
        reject(err);
      }
    });
  }

  function ConsultMensajeriaClientXTime(empresa) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `
        select * from pg_chatbot_mensajeria_client pcmc where time_send is not NULL and empresa = ${empresa} and activo = 'S' `;
        result = await Select_In_Postgre(consult);
        resolve(result.rows);
      } catch (err) {
        console.log('ConsultMensajeriaClientXTime', err)
        reject(err);
      }
    });
  }


  function ConsultInfoRifaxLoteria(id, NumberEmp, loteria) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `SELECT  s.id, s.nombre, s.descripcion, s.activo, s.activo, s.cod_producto, s.empresa, s.numero_length,  s.valor_apuesta ,
          s.valor_premio,to_char( s.fecha_sorteo,'DD/MM/YYYY') AS fecha_sorteo, l.codigo AS codigo_loteria ,l.nombre as nombre_loteria, l.hora_sorteo, s.tipo_juego, s.min_cantidad_venta
          FROM pg_chatbot_servicios_productos s, pg_chatbot_loterias l
          WHERE l.codigo in (${loteria})
          AND s.id = ${id} AND  s.activo = 'S' AND  s.empresa = ${NumberEmp} AND  DATE_TRUNC('day', s.fecha_sorteo) >= DATE_TRUNC('day', NOW())
          AND l.hora_sorteo >=  CURRENT_TIME`;
        result = await Select_In_Postgre(consult);
        if (result.rows.length > 0) {
          resolve(result.rows);
        } else {
          reject(`En este momento, no es posible ingresar en el sorteo, si no deberia ser de esta manera, por favor comunicate con tu promotor 🤳🏻!`);
        }

      } catch (err) {
        console.log('ConsultInfoRifaxLoteria', err)
        reject(err);
      }
    });
  }


  function ValidateNumberSorteoxLoteria(id_rifa, loteria) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `SELECT * FROM pg_chatbot_rifas_vendidas where id_rifa = ${id_rifa} and estado_venta = 'N' and cod_loteria = '${loteria}'`;
        result = await Select_In_Postgre(consult);
        if (result.rows.length > 0) {
          resolve(result.rows);
        } else {
          reject(`No se encontraron numeros disponibles para el sorteo...`);
        }
      } catch (err) {
        console.log('ValidateNumberSorteoxLoteria', err)
        reject(err);
      }
    });
  }


  function ConsultTotalVentaRifaxLoteria(id_rifa, numero_length, loteria) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `SELECT  COUNT(*) AS total_ventas,(COUNT(*) / POWER(10, ${numero_length})) * 100 AS porcentaje_vendido
        FROM pg_chatbot_rifas_vendidas WHERE id_rifa = ${id_rifa} AND estado_venta = 'S' and cod_loteria = '${loteria}'`;
        result = await Select_In_Postgre(consult);
        resolve(result.rows);
      } catch (err) {
        console.log('ConsultTotalVentaRifaxLoteria', err)
        reject(err);
      }
    });
  }


  function SearchFilterBoletas(id_rifa, busqueda) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `SELECT numero_vendido as numero FROM pg_chatbot_rifas_vendidas where id_rifa = ${id_rifa} and estado_venta = 'N' and numero_vendido like '${busqueda}'
      ORDER BY RANDOM() LIMIT 10`;
        result = await Select_In_Postgre(consult);
        if (result.rows.length > 0) {
          resolve(result.rows);
        } else {
          reject(`No se encontraron numeros disponibles para consultar con esta busqueda *${busqueda.replace(/%/g, '#')}*`);
        }
      } catch (err) {
        console.log('SearchFilterBoletas', err)
        reject(err);
      }
    });
  }

  function SearchFilterBoletasxLoteria(id_rifa, busqueda, loteria) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `SELECT numero_vendido as numero FROM pg_chatbot_rifas_vendidas where id_rifa = ${id_rifa} and estado_venta = 'N' and numero_vendido like '${busqueda}' and cod_loteria = '${loteria}'
      ORDER BY RANDOM() LIMIT 10`;
        result = await Select_In_Postgre(consult);
        if (result.rows.length > 0) {
          resolve(result.rows);
        } else {
          reject(`No se encontraron numeros disponibles para consultar con esta busqueda *${busqueda.replace(/%/g, '#')}*`);
        }
      } catch (err) {
        console.log('SearchFilterBoletasxLoteria', err)
        reject(err);
      }
    });
  }

  function ConsultBoletaIsVentaxLoteria(id_rifa, numeros, nanoid, loteria) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `
        SELECT id,id_rifa,numero_vendido,vendido_por,to_char(fecha_venta, 'dd/mm/yyyy hh24:mi:ss') as fecha_venta,estado_venta,cliente,cifrado,'${nanoid}' as nano
        FROM pg_chatbot_rifas_vendidas where id_rifa = ${id_rifa} and estado_venta = 'S' and cod_loteria = '${loteria}'
        and numero_vendido in(${numeros})`;
        result = await Select_In_Postgre(consult);
        resolve(result.rows);
      } catch (err) {
        console.log('ConsultBoletaIsVentaxLoteria', err)
        reject(err);
      }
    });
  }



  function SaveVentaBoletasxLoteria(vendedor, cliente, id_rifa, numeros, saldofinal, loteria) {
    return new Promise(async (resolve, reject) => {
      let consult1, consult2;
      let result1, result2;
      let resp;
      try {
        const sinComillas = numeros.replace(/'/g, '');
        const arrayNumeros = sinComillas.split(',');
        const resultado = arrayNumeros.join('');
        const nanoid = await generarID().then(id => {
          return id;
        }).catch(error => {
          console.error('Error al generar ID:', error);
          throw error;
        });
        if (loteria == 0) {
          let confechasys = `select to_char(now(),'ddmmyyyyhh24miss') as fecha_sys`;
          resultfechasys = await Select_In_Postgre(confechasys);
          consult1 = `UPDATE public.pg_chatbot_rifas_vendidas
        SET vendido_por=${vendedor}, fecha_venta=NOW(), estado_venta='S', cliente=${cliente} , cifrado = '${nanoid + "" + id_rifa + "" + resultado + "" + vendedor + "" + cliente + "" + resultfechasys.rows[0].fecha_sys}' , nanoid = '${nanoid}'
        WHERE id_rifa=${id_rifa} AND numero_vendido IN(${numeros})`;
          result1 = await Select_In_Postgre(consult1);
        } else {
          let confechasys = `select to_char(now(),'ddmmyyyyhh24miss') as fecha_sys`;
          resultfechasys = await Select_In_Postgre(confechasys);
          consult1 = `UPDATE public.pg_chatbot_rifas_vendidas
            SET vendido_por=${vendedor}, fecha_venta=NOW(), estado_venta='S', cliente=${cliente} , cifrado = '${nanoid + "" + id_rifa + "" + resultado + "" + vendedor + "" + cliente + "" + resultfechasys.rows[0].fecha_sys}' , nanoid = '${nanoid}'
            WHERE id_rifa=${id_rifa} AND cod_loteria = '${loteria}' AND numero_vendido IN(${numeros})`;
          result1 = await Select_In_Postgre(consult1);
        }


        consult2 = `UPDATE public.pg_chatbot_client
        SET saldo=${saldofinal}
        WHERE telefono=${vendedor}`;
        result2 = await Select_In_Postgre(consult2);

        if (result1.rowCount > 0 && result2.rowCount > 0) {
          resp = await ConsultBoletaIsVenta(id_rifa, numeros, nanoid);
          if (resp.length > 0) {
            //   await client.query('COMMIT');
            resolve(resp);
          } else {
            //    await client.query('ROLLBACK');
            reject('Error  al consultar la data del  QR ..., por favor intentar nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓')
          }

        } else {
          //   await client.query('ROLLBACK');
          reject('Error al realizar la venta... 🧧, por favor intentar nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓');
        }

      } catch (err) {
        console.log('SaveVentaBoletas', err)
        //  await client.query('ROLLBACK');
        //  await client.end();
        reject(err);
      }
    });
  }


  function SaveVentaBoletas2(vendedor, id_rifa, numeros, saldofinal) {
    return new Promise(async (resolve, reject) => {
      let consult, consult2;
      let result, result2;
      let resp;
      try {

        consult = `
        SELECT id,id_rifa,numero_vendido,vendido_por,to_char(fecha_venta, 'dd/mm/yyyy hh24:mi:ss') as fecha_venta,estado_venta,cliente,cifrado,nanoid as nano
        FROM pg_chatbot_rifas_vendidas where id_rifa = ${id_rifa} and estado_venta = 'S'
        and numero_vendido in(${numeros})`;
        result = await Select_In_Postgre(consult);

        consult2 = `UPDATE public.pg_chatbot_client
        SET saldo=${saldofinal}
        WHERE telefono=${vendedor}`;
        result2 = await Select_In_Postgre(consult2);

        if (result2.rowCount > 0) {
          resp = await ConsultBoletaIsVenta(id_rifa, numeros, result.rows[0].nano);
          if (resp.length > 0) {
            //  await client.query('COMMIT');
            resolve(resp);
          } else {
            //   await client.query('ROLLBACK');
            reject('Error  al consultar la data del  QR ..., por favor intentar nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓')
          }

        } else {
          //   await client.query('ROLLBACK');
          reject('Error al realizar la venta... 🧧, por favor intentar nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓');
        }

      } catch (err) {
        console.log('SaveVentaBoletas2', err)
        //  await client.query('ROLLBACK');
        //  await client.end();
        reject(err);
      }
    });
  }

  function ConsultRifaVPremiosAdd(id_rifa, numero_premiado, NumberEmp) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `SELECT *
        FROM public.pg_chatbot_rifas_vendidas_premios_adicionales
        WHERE id_rifa = ${id_rifa} and numero_premiado = '${numero_premiado}' and estado_venta = 'N' and empresa = ${NumberEmp}`;
        result = await Select_In_Postgre(consult);
        if (result.rows.length > 0) {
          resolve(result.rows);
        } else {
          reject(`No es un numero de rida con premio adicional...`);
        }
      } catch (err) {
        console.log('ConsultRifaVPremiosAdd_', err)
        reject(err);
      }
    });
  }

  function UpdateRifaVPremiosAdd(id_rifa_vendida, id_rifa, numero_premiado, NumberEmp) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        consult = `UPDATE public.pg_chatbot_rifas_vendidas_premios_adicionales
        SET id_rifa_vendida=${id_rifa_vendida}, estado_venta='S', freg=NOW()
        WHERE id_rifa = ${id_rifa} and numero_premiado = '${numero_premiado}' and estado_venta = 'N' and empresa = ${NumberEmp}`;
        result = await Select_In_Postgre(consult);
        if (result.rowCount > 0) {
          resolve('PREMIO ADICIONAL GANADO CON EXITO');
        } else {
          //    await client.query('ROLLBACK');
          reject('Error al realizar el proceso de actualizacion de rifa premio add.., por favor intentar nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓');
        }
      } catch (err) {
        if (err.includes('Release called on client which has already been released to the pool.')) {
          console.log('Liberación solicitada en el cliente que ya ha sido liberado al grupo.')
        } else {
          console.log('UpdateRifaVPremiosAdd', err)
          reject(err);
        }
      }
    });
  }

  //KENNO

  function ListMenusOpcionesJuegos(producto, id, NumberEmp) {
    return new Promise(async (resolve, reject) => {
      let consult, result;
      try {
        if (producto == 4) {//KENNO
          if (id == 0) {
            consult = `select * from pg_chatbot_configuracion_kenno where empresa = ${NumberEmp} and cod_producto = ${producto} and activo = 'S' order by 1`;
          } else {
            consult = `select * from pg_chatbot_configuracion_kenno where empresa = ${NumberEmp} and cod_producto = ${producto} and id = ${id} and activo = 'S' order by 1`;
          }
          result = await Select_In_Postgre(consult);
          // console.log('sdasd>>>',producto)
          if (result.rows.length > 0) {
            resolve(result.rows);
          } else {
            reject(`No se encontro *JUEGOS* activos en este momento, por favor intentalo nuevamente ,si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓`);
          }
        } else {
          reject(`No se encontran *JUEGOS* activos en este momento, por favor intentalo nuevamente ,si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓`);
        }

      } catch (err) {
        console.log('ListMenusOpcionesJuegos', err)
        reject(err);
      }
    });
  }

  function JugarKenno(NumberClient, NumberEmp, Numeros, valorApuesta, idconfiguracion, response_config_producto ,referido) {
    return new Promise(async (resolve, reject) => {
      let consult_data_cliente, result_data_cliente
      let consultupdate_saldo, resultupdate_saldo;
      let operation_saldo = 0;

      let consultinsert_apuesta, resultinsert_apuesta;

      let consultinsert_sorteo, resultinsert_sorteo;
      let consultupdate_apuesta, resultupdate_apuesta;

      let consult_data_plan_premio, result_data_plan_premio;

      let consult_control_kenno, result_control_kenno;
      try {
        //DESCONSTAR SALDO
        consult_data_cliente = `SELECT * FROM public.pg_chatbot_client WHERE telefono=${NumberClient} and empresa = ${NumberEmp}`;
        result_data_cliente = await Select_In_Postgre(consult_data_cliente);
        if (result_data_cliente.rows.length > 0) {
          operation_saldo = result_data_cliente.rows[0].saldo
          consultupdate_saldo = `UPDATE public.pg_chatbot_client SET saldo=${(Number(operation_saldo) - Number(valorApuesta))} WHERE telefono=${NumberClient} and empresa = ${NumberEmp}`;
          resultupdate_saldo = await Select_In_Postgre(consultupdate_saldo);
          //
          if (resultupdate_saldo.rowCount > 0) {
            //REGISTAR APUESTA

            let cod_Ref;
            if (referido != null) {
              cod_Ref = referido;
            } else {
              cod_Ref = 1
            }
            
            consultinsert_apuesta = {
              cliente: Number(NumberClient), empresa: Number(NumberEmp), freg: new Date(),
              numeros_apostados: Numeros, valor_apostado: valorApuesta, estado_apuesta: 'P', id_sorteo: null, id_configuracion: idconfiguracion,
              valor_ganado : null , aciertos: null , referido: cod_Ref
            };
            resultinsert_apuesta = await Insert_In_Postgre('pg_chatbot_apuestas_kenno', consultinsert_apuesta);
            //
            if (resultinsert_apuesta.rowCount > 0) {

              consult_control_kenno = `SELECT * FROM public.pg_chatbot_control_premio_kenno WHERE id_config = ${idconfiguracion} AND estado = 'S' `;
              result_control_kenno = await Select_In_Postgre(consult_control_kenno);
              // console.log('Test>>>', result_control_kenno.rows)
              //  if (Array.isArray(numerosSorteados)) {

              let [numerosSorteados, aciertos] = generarNumerosSorteoKenno(response_config_producto[0].rango_minimo_numeros_x_sorteo,
                response_config_producto[0].rango_maximo_numeros_x_sorteo, response_config_producto[0].cantidad_numeros_x_sorteo,
                Numeros, result_control_kenno.rows);

              /*  }else{
                  reject('Muero');
                }*/

              //GENERAR SORTEO ALEATORIO
              if (Array.isArray(numerosSorteados)) {

                const numerosEnString = numerosSorteados.join('-');
                // console.log(numerosEnString);
                consultinsert_sorteo = { fecha_sorteo: new Date(), numeros_ganadores: numerosEnString, id_apuesta: resultinsert_apuesta.rows[0].id };
                resultinsert_sorteo = await Insert_In_Postgre('pg_chatbot_sorteos_kenno', consultinsert_sorteo);

                consultupdate_apuesta = `UPDATE public.pg_chatbot_apuestas_kenno SET estado_apuesta = 'E', id_sorteo = ${resultinsert_sorteo.rows[0].id} WHERE id = ${resultinsert_apuesta.rows[0].id}`;
                resultupdate_apuesta = await Select_In_Postgre(consultupdate_apuesta);
                //

                // CONSULTAR VALOR PREMIO A LOS ACIERTOS y pagar premio

                let contar_numeros = Numeros.split("-")
                consult_data_plan_premio = `select * from pg_chatbot_plan_premio_kenno where id_configuracion = ${idconfiguracion} and cantidad_de_numeros_jugados = ${contar_numeros.length} and cantidad_de_aciertos = ${aciertos}`;
                result_data_plan_premio = await Select_In_Postgre(consult_data_plan_premio);
                if (result_data_plan_premio.rows.length > 0) {

                  const pagar = (Number(valorApuesta) * Number(result_data_plan_premio.rows[0].valor_premio));

                  consultupdate_apuesta = `UPDATE public.pg_chatbot_apuestas_kenno SET estado_apuesta = 'C', id_sorteo = ${resultinsert_sorteo.rows[0].id}, valor_ganado = ${pagar}, aciertos = ${aciertos} WHERE id = ${resultinsert_apuesta.rows[0].id}`;
                  resultupdate_apuesta = await Select_In_Postgre(consultupdate_apuesta);

                  consult_data_cliente = `SELECT * FROM public.pg_chatbot_client WHERE telefono=${NumberClient} and empresa = ${NumberEmp}`;
                  result_data_cliente = await Select_In_Postgre(consult_data_cliente);
                  if (result_data_cliente.rows.length > 0) {
                    operation_saldo = result_data_cliente.rows[0].saldo
                    consultupdate_saldo = `UPDATE public.pg_chatbot_client SET saldo=${(Number(operation_saldo) + Number(pagar))} WHERE telefono=${NumberClient} and empresa = ${NumberEmp}`;
                    resultupdate_saldo = await Select_In_Postgre(consultupdate_saldo);
                    if (resultupdate_saldo.rowCount > 0) {
                      //OK
                      consult_data_cliente = `SELECT * FROM public.pg_chatbot_client WHERE telefono=${NumberClient} and empresa = ${NumberEmp}`;
                      result_data_cliente = await Select_In_Postgre(consult_data_cliente);

                      const data = [{ message: 'VENTA REALIZADA CON EXITO!', numeros_sorteados: numerosEnString, valor_ganado: pagar, saldo_final: result_data_cliente.rows[0].saldo, aciertos: aciertos, fecha_apuesta: Utilitys.formatearFecha(resultinsert_apuesta.rows[0].freg) }];
                      resolve(data);
                    } else {
                      //   await client.query('ROLLBACK');
                      reject('Error al realizar el proceso de actualizacion de saldo del cliente.., por favor intentar nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓');
                    }

                  } else {
                    reject(`No se encontran *DATOS* de la del cliente, por favor intentalo nuevamente ,si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓`);
                  }

                } else {
                  reject(`No se encontro *pLan de premio configurado* para este juego, por favor intentalo nuevamente ,si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓`);
                }
                //

              } else {
                //    await client.query('ROLLBACK');
                reject(`${numerosSorteados}, por favor comunicate con el departamento de tecnologia 🖥️🤓`);
              }
              //


            } else {
              // ROLLBACK SI EL INSERT FALLA
              //   await client.query('ROLLBACK');
              reject('Error al registrar la apuesta.., por favor intentar nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓');
            }
            //
          } else {
            //   await client.query('ROLLBACK');
            reject('Error al realizar el proceso de actualizacion de saldo del cliente.., por favor intentar nuevamente , si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓');
          }
        } else {
          reject(`No se encontran *DATOS* de la del cliente, por favor intentalo nuevamente ,si no funciona por favor comunicate con el departamento de tecnologia 🖥️🤓`);
        }

      } catch (err) {
        console.log('JugarKenno', err)
        reject(err);
      }
    });
  }



  function generarNumerosSorteoKenno(rango_minimo_numeros_x_sorteo, rango_maximo_numeros_x_sorteo, cantidad_numeros_x_sorteo, NumberC, result_control_kenno) {
    const numeros = [];

    if (rango_minimo_numeros_x_sorteo >= rango_maximo_numeros_x_sorteo) {
      return 'El rango mínimo no puede ser mayor que el rango máximo.';
    }

    if (cantidad_numeros_x_sorteo > (rango_maximo_numeros_x_sorteo - rango_minimo_numeros_x_sorteo + 1)) {
      return 'La cantidad de números solicitados no cumple con el rango necesario.';
    }

    const numerosPosibles = [];

    // Crear un array con todos los números posibles
    for (let i = rango_minimo_numeros_x_sorteo; i <= rango_maximo_numeros_x_sorteo; i++) {
      numerosPosibles.push(i);
    }

    if (result_control_kenno.length > 0) {

      if (result_control_kenno[0].nivel == 1) { //nivel general

        // Seleccionar números aleatorios del array de posibles sin reemplazo
        for (let i = 0; i < cantidad_numeros_x_sorteo; i++) {
          const indiceAleatorio = Math.floor(Math.random() * numerosPosibles.length);
          numeros.push(Utilitys.agregarCero(numerosPosibles[indiceAleatorio]));
          numerosPosibles.splice(indiceAleatorio, 1); // Eliminar el número seleccionado para evitar duplicados
        }

        numeros.sort((a, b) => a - b);
     //   console.log('Numeros Soeteos >>>',numeros)
        const numerosEnString = numeros.join('-');
        const aciertos = compararListaApuestaySorteoKenno(convertirAArreglo(NumberC), convertirAArreglo(numerosEnString));

        if (aciertos <= result_control_kenno[0].dato) {
          return [numeros, aciertos];
        } else {
          console.log('Generó un sorteo No permitido de ', aciertos);
          return generarNumerosSorteoKenno(rango_minimo_numeros_x_sorteo, rango_maximo_numeros_x_sorteo, cantidad_numeros_x_sorteo, NumberC, result_control_kenno);
        }
      }

    } else {
      console.log('No hay control kenno programado para este juego', result_control_kenno.length);
      // Seleccionar números aleatorios del array de posibles sin reemplazo

      for (let i = 0; i < cantidad_numeros_x_sorteo; i++) {
        const indiceAleatorio = Math.floor(Math.random() * numerosPosibles.length);
        numeros.push(Utilitys.agregarCero(numerosPosibles[indiceAleatorio]));
        numerosPosibles.splice(indiceAleatorio, 1); // Eliminar el número seleccionado para evitar duplicados
      }

     // console.log('Numeros Soeteos >>>',numeros)
      numeros.sort((a, b) => a - b);

      const numerosEnString = numeros.join('-');
      const aciertos = compararListaApuestaySorteoKenno(convertirAArreglo(NumberC), convertirAArreglo(numerosEnString));

      return [numeros, aciertos];
    }

  }


  function compararListaApuestaySorteoKenno(jugado, sorteo) {
    //  console.log('jugado>>>', jugado)
    // console.log('sorteo>>>', sorteo)
    const conjuntoJugado = new Set(jugado);
    const conjuntoSorteo = new Set(sorteo);

    const coincidencias = jugado.filter(numero => conjuntoSorteo.has(numero));

    return coincidencias.length;

  }

  function convertirAArreglo(cadena) {
    return cadena.split('-').map(Number);
  }


  return {
    getValidaEmpresa,
    getValidaClient,
    SessionsAll,
    SaveSession,
    ConsultSession,
    UpdateSession,
    CloseSession,
    ListMenusUsers,
    ListMenusOpcionesUsers,
    ConsultInfoRifa,
    ValidateNumberSorteo,
    ConsultTotalVentaRifa,
    RadomNumberBoletas,
    SaveVentaBoletas,
    ConsultBoletaIsVenta,
    ConfigMsnTimbre,
    getValidaAdmin,
    ConsultRecargarSaldo_ClientAdmin,
    RecargarSaldo_ClientAdmin,
    Log_Recargas,
    ConsultaValidaReferido,
    ConsultaIntervalReferido,
    ConsultMensajeriaClient,
    ConsultMensajeriaClientXTime,
    ConsultInfoRifaxLoteria,
    ValidateNumberSorteoxLoteria,
    ConsultTotalVentaRifaxLoteria,
    SearchFilterBoletas,
    SearchFilterBoletasxLoteria,
    ConsultBoletaIsVentaxLoteria,
    SaveVentaBoletasxLoteria,
    SaveVentaBoletas2,
    ConsultRifaVPremiosAdd,
    UpdateRifaVPremiosAdd,
    ListMenusOpcionesJuegos,
    JugarKenno,
  };
};
