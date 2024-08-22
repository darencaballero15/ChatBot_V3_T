const express = require('express');
const router = express.Router();
const response = require('../../../network/response');
const Services = require('./index');
const Utilitys = require('../../../utils/Utility.js')
const Messages = require('../../../utils/Messages.js')
const Excels = require('../../../utils/Excels.js')
const moment = require('moment')
moment.locale('es')

const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')

const fs = require('fs');
const ora = require('ora');
const chalk = require('chalk');
const glob = require('glob');
const FechaSys = moment().format('L');
const path = require('path');
let bot;
let spinner;
router.post("/test", Test)

async function Test(req, res, next) {
  try {
    const datos = await Services.Test(req.body);
    response.success(req, res, datos);
  } catch (error) {
    next(error);
  }
}


//---------------------------------------FUNCIONES-----------------------------------------------//

async function getValidaEmpresa(NumberClient, NumberEmp) {
  try {
    const datos = await Services.getValidaEmpresa(NumberClient, NumberEmp);
    return datos;
  } catch (error) {
    return error;
  }
}

//---------------------------------------------------------------------------------------//

async function Close_Session(numero, emp, msg) {
  try {
    const datos = await Services.CloseSession(numero, emp);
    const number = numero;
    bot.telegram.sendMessage(msg.chat.id, Messages.CloseSession(), { parse_mode: 'Markdown' })
    return datos;
  } catch (error) {
    return error;
  }
}

try {
  bot = new Telegraf(process.env.BOT_TOKEN);
} catch (error) {
  console.error('Error al inicializar Telegraf:', error.message);
  process.exit(1);
}


process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

async function verifyBotToken(bot) {
  try {
    if (!bot || !bot.telegram) {
      throw new Error('El bot de Telegram no está correctamente inicializado.');
    }
    await bot.telegram.getMe(); // Intenta hacer una solicitud simple para verificar el token
  } catch (error) {
    if (error.code === 401) {
      throw new Error('Token de bot inválido o no autorizado. Verifica tu BOT_TOKEN.');
    } else {
      throw new Error(`Error al verificar el BOT_TOKEN: ${error.message}`);
    }
  }
  return true
}
//---------------------------------------------------------------------------------------//

const StartSession = async () => {

    spinner = ora(`Loading ${chalk.yellow('Validating session with Telegram...')}`);
    spinner.start();
    const result = await verifyBotToken(bot, spinner);

      spinner.text = 'Connected to Telegram!';
      spinner.succeed();

      bot.on('message', async msg => {

        if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
          console.log(`El bot está en un grupo. Saliendo del grupo ${msg.chat.id}...`);
          try {
            await msg.leaveChat();
          } catch (error) {
            console.error(`Error al salir del grupo ${msg.chat.id}:`, error.message);
          }
          return;
        } else {
          if (msg.message.from.is_bot == false) {
            let response_generic, response_data_emp, response_data_client, response_session, response_config_msn_tirilla = [];
            let response_config_producto = [];
            let [Msn, NumberClient, NumberEmp] = await Utilitys.cleanNumberAndMessage(msg);
            let timer_global = 3000;
            response_data_emp = await getValidaEmpresa(NumberClient, NumberEmp);
            if (Array.isArray(response_data_emp)) {
              if (Msn != 'gracias' && Msn != 'chao' && Msn != 'adios' && Msn != 'hasta luego') {
                response_generic = await getValidaAdmin(NumberClient, NumberEmp);
                console.log(msg.message)
              } else {
                await Close_Session(NumberClient, NumberEmp, msg);
              }
            } else {
              bot.telegram.sendMessage(msg.chat.id, response_data_emp, { parse_mode: 'Markdown' })
            }
          }
        }
      });
    await bot.launch();




  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
};


StartSession();



module.exports = router;




