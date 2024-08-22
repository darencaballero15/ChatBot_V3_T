
const Services = require('../api/components/chatbot_v3_t/index');
const moment = require('moment');
const fechaHoy = moment().format('L');
const Utilitys = require('../utils/Utility')
const path = require('path');
const fs = require('fs');

function ListIconsNumber(Number, estado) {
  const list = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
  var number = Number,
    output = [], sNumber = number.toString();

  if (estado == "S") {
    if (sNumber.length === 1) {
      sNumber = "0" + sNumber;
    }
  }

  for (var i = 0, len = sNumber.length; i < len; i += 1) {
    output.push(list[+sNumber.charAt(i)]);
  }

  return output.toString().replace(',', '');
}


function CloseSession() {
  let msn = `*Sesion finalizada
     
Gracias por confiar en nuestros servicios.

Ha sido un placer atenderte. Estamos aquí para cualquier consulta adicional que puedas tener en el futuro.

Esperamos poder servirte nuevamente, Hasta Pronto! 🤖👋🏻😊*`;
  return msn;
}

function MsnWelcomeRegister() {
  let msn = `*¡Bienvenid@!* 🎉

*Nos alegra mucho tenerte con nosotros. Te hemnos registrado exitosamente y ahora formas parte de nuestra comunidad.*

*Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos. Estamos aquí para asistirte en todo lo que necesites.*

*¡Disfruta de todos los beneficios y servicios que ofrecemos!*
`;
  return msn;
}

function MsnIngresaReferido() {
  let msn = `📱🎉 Para empezar, por favor ingresa el *@* del referido que te recomendó.
Si no tienes uno, simplemente ingresa *0* para continuar. 👤➡️📲

*Ejemplo : @referido123*`;
  return msn;
}




function MsnWelcome(empresa) {

  let msn = `¡Hola! Soy *${empresa[0].nombre_bot.toUpperCase()}* 👋🤖,
hago parte del equipo de *${empresa[0].nombre_empresa.toUpperCase()}* 🌍🖤🌎.`;
  return msn;
}


function esImagen(archivo) {
  const extensionesValidas = ['.jpg', '.jpeg', '.png', '.gif'];
  const extension = path.extname(archivo).toLowerCase();
  return extensionesValidas.includes(extension);
}

function WelcomeImg(client, MessageMedia, NumberClient, path) {
  //console.log(path)
  let ruta = path;
  let indiceActual = 0;
  let caption ;
  
  if (!fs.existsSync(ruta)) {
    return;
  }
  const archivos = fs.readdirSync(ruta);

   let tipo = 'CLIENTE';
  

  archivos.forEach(archivo => {
    if (esImagen(archivo)) {
    indiceActual++;
    if (indiceActual == archivos.length ) {
      caption = ``;
    }
    const media = MessageMedia.fromFilePath(ruta + '/' + archivo);
    client.sendMessage(NumberClient, media, {
      caption: caption
    });
   }
    //new Promise((resolve) => setTimeout(resolve, 5000));
  });

  
}

function ListMain(client, NumberClient, NumberEmp, opcion_act, resp, producto_menu, id_cod,indicativo_pais,temp2,referido) {
   let tipo = 'productos';
  
 
   let opcion;
   if (opcion_act == 2) {
     opcion = '';
   } else {
     opcion = '*Recuerde que para volver al menu anterior ingrese el numero 0️⃣,*';
   }
 
 
 
   let save = '';
   let list = `A continuación, te presentamos los ${tipo} disponibles  para usted,${opcion}
Por favor ingrese el numero de la opcion que desea :
  `;
 
 
   if (id_cod == 1) {
     for (let datos of resp) {
       let cont = `  
  *${ListIconsNumber(datos.id, "N")}. ${datos.nombre} - (${datos.descripcion.toUpperCase()})*`;
       list += cont;
       save += `${datos.id},`
     }
   } else if (id_cod == 2) {
     for (let datos of resp) {
       let cont = `  
  *${ListIconsNumber(datos.cod_producto, "N")}. ${datos.nombre} - (${datos.descripcion.toUpperCase()})*`;
       list += cont;
       save += `${datos.cod_producto},`
     }
   }
   Services.ctr.UpdateSession(Utilitys.quitarIndicativo(NumberClient.replace('@c.us', ''),indicativo_pais), NumberEmp, save.slice(0, -1), opcion_act, producto_menu, '',temp2,referido);
   return client.sendMessage(NumberClient, list);
 }

 function InvalidGneric(text) {
  let msn = `Lo siento, Pero *NO* es ${text}... 🚨⚠️
Por favor valida e intentalo nuevamente.`;
  return msn;
}

function InvalidGneric2(text) {
  let msn = `Lo siento, ${text}... 🚨⚠️
Por favor valida e intentalo nuevamente.`;
  return msn;
}

function MessageSaldoClient(data) {
  let msn = `Su saldo actual es de: *${Utilitys.darFormatoMoneda(data[0].saldo)}*`;
  return msn;
}

function MessageQRsRecarga() {
  let msn = `*Estimado/a cliente*,

*Para su comodidad, puede recargar su saldo utilizando los siguientes canales*

*Por favor, escanee las imágenes QR de los siguientes plataformas disponibles para realizar su recarga de saldo :*`;
  return msn;
}

function MessageSelectLoteria(client, NumberClient, NumberEmp, data, opcion_act, producto_menu,temp2,indicativo_pais,referido) {
  let save = '';
   let list = `*Esta es la lista de los loterias disponibles para este sorteo :*
    `;
 
   for (let i = 0; i < data.length; i++) {
     list += `\n ${ListIconsNumber(data[i].codigo_loteria, "N")}. *${data[i].nombre_loteria}*`;
     save += `${data[i].codigo_loteria},`
   }
   list += `\n
*Recuerde que para salir al menu anterior ingrese el numero ⿠*`;
   
Services.ctr.UpdateSession(Utilitys.quitarIndicativo(NumberClient.replace('@c.us', ''),indicativo_pais), NumberEmp, save.slice(0, -1), opcion_act, producto_menu, '',temp2,referido);
return client.sendMessage(NumberClient, list);
 }

 function MessageInfoRifa(resp, pes) {
  let msn = `🧧*( ${resp[0].descripcion} )* que juega para el dia *${resp[0].fecha_sorteo}*,
con la loteria de *${resp[0].nombre_loteria}*, con un numero de *${resp[0].numero_length}* cifras 
por un valor de venta de *${Utilitys.darFormatoMoneda(resp[0].valor_apuesta)}* pesos 🧧

Total vendido el : *%${pes[0].porcentaje_vendido}*

*Para volver o salir al menu anterior ingrese el numero ⿠*
`;
  return msn;
}

function MsnListAdmin(client, NumberClient, NumberEmp, opcion_act, producto_menu, temp2, indicativo_pais) {
 // console.log('Log>>>', NumberClient, NumberEmp, opcion_act, producto_menu, temp2, indicativo_pais)
  let save = '1,';
  let list = `A continuación, te presentamos las opciones disponibles para ti.
Por favor, ingresa el número de la opción que deseas

1️⃣. *RECARGAR SALDO DE CLIENTE*`;

Services.ctr.UpdateSession(Utilitys.quitarIndicativo(NumberClient.replace('@c.us', ''),indicativo_pais), NumberEmp, save.slice(0, -1), opcion_act, producto_menu, '',temp2,null);
return client.sendMessage(NumberClient, list);
}

function MensageNumberClientAdmin() {
  let msn = `Por favor, ingresa el numero de telefono del cliente.📱
*Recuerde que para salir al menu anterior ingrese el numero ⿠*`

  return msn;
}

function MensajeSaldoActualClientAdmin(data) {
 // console.log('Test>>>',data)
  let msn = `Este es el saldo actual *${data[0].saldo}* del *CLIENTE* : *${data[0].telefono}*.

Por favor, ingresa el *MONTO* que deseas *RECARGAR* al cliente utilizando el siguiente formato:

Solo monto: *1000-*
Monto con referido: *1000-@referido123*

*Recuerde que para salir al menu anterior ingrese el numero ⿠*`

  return msn;
}

function MensageConfirmarRecargarSaldoClient_Admin(cliente,saldo) {
  let msn = `*Estas segur(@) que deseas recargar el saldo al cliente con los siguientes datos❓.*
  ------------------------------------------------------
*CLIENTE : ${cliente}*
*SALDO A RECARGAR : ${Utilitys.darFormatoMoneda(saldo)}*
------------------------------------------------------

  1️⃣. *SI*
  2️⃣. *NO*`
  return msn;
}

function MensageReferido() {
  let msn = `*Por favor, ingresa el CÓDIGO del referido, si lo tienes.*👨🏼‍🏫

*Si no es el caso, por favor ingresa 1️⃣.*

*Recuerde que para salir al menu anterior ingrese el numero ⿠*`

  return msn;
}

function MensageCantidaddeBoletasGenerar(data) {
  let msn = `Por favor, ingresa el número de bonos que deseas generar.

Cantidad mínima: *${data[0].min_cantidad_venta}.*

*Recuerde que para salir al menu anterior ingrese el numero ⿠*`

  return msn;
}

function MensageBonoGanador(data) {
  let msn = `¡🎉Felicidades! 🎉

Has sido el ganador con el número *${data[0].numero_premiado}*. Te has llevado un bono de *$${data[0].descripcion_premio}*. 🤑💸

¡Disfrútalo! 🎁😊`

  return msn;
}

function MessageSearchFilterBoletas(data) {
  let list = `*Esta es la lista de los números disponibles para consultar :*
  -------------------------------------------------------`;

  for (let i = 0; i < data.length; i++) {
    list += `\n*NUMERO ${i + 1}*   :   *${data[i].numero}*`;
  }

  list += '\n\n-------------------------------------------------------';
  return list;
}

function MensageNumberClient() {
  let msn = `📱Por favor ingrese el numero de telefono del cliente📱🫂
  *Recuerde que para salir al menu anterior ingrese el numero ⿠*,`
  return msn;
}

function MessageVentaRifa(data, numeros) {
  let splitt = numeros.split(',');
  let total = Utilitys.calculaValor(splitt[0], data[0].valor_apuesta)
  const list = `*Esta es la informacion sobre la venta :*
-------------------------------------------------------      
*BONO*\t\t: ${data[0].descripcion}
*FECHA SORTEO*\t: ${data[0].fecha_sorteo} ${data[0].hora_sorteo}
*LOTERIA*\t\t: ${data[0].nombre_loteria}
*CIFRAS*\t\t: ${data[0].numero_length}
*NUMEROS*\t: ${splitt[0]}
*VALOR X BONO*\t: ${Utilitys.darFormatoMoneda(data[0].valor_apuesta)}
*CLIENTE*\t\t: ${splitt[1]}
-------------------------------------------------------
*VALOR TOTAL*\t: *${Utilitys.darFormatoMoneda(total)}*
-------------------------------------------------------`;
  return list;
}

function MessageConfirmarVentaBoleta() {
  let msn = `*Estas segur(@) que deseas realizar la venta❓💵.*
  1️⃣. *SI*
  2️⃣. *NO*`
  return msn;
}

//KENNO

function MessageWelcomeKenno(data) {
  let msn = `Bienvenido a *${data[0].nombre.toUpperCase()}!* 🎉

🎲 En este emocionante juego, tienes la oportunidad de elegir tus números de la suerte y ganar premios.

🔹 Apuesta mínima: *${Utilitys.darFormatoMoneda(data[0].valor_minima_apuesta)}*
🔹 Apuesta máxima: *${Utilitys.darFormatoMoneda(data[0].valor_maxima_apuesta)}*

🔸 *Cómo jugar:*

1. Elige tus números del *${data[0].rango_minimo_numeros_x_sorteo}* al *${data[0].rango_maximo_numeros_x_sorteo}*.
2. El sorteo se realiza con *${data[0].cantidad_numeros_x_sorteo}* balotas numeradas.

🔻 *Ejemplo de juego:* *${Utilitys.agregarCero(data[0].rango_minimo_numeros_x_sorteo)}-7-15-20-23-17-${Utilitys.agregarCero(data[0].rango_maximo_numeros_x_sorteo)}*

⚠️*Recuerda:*

Mínimo de números permitidos: *${data[0].cantidad_minima_numeros_parilla}*
Máximo de números permitidos: *${data[0].cantidad_maxima_numeros_parilla}*

_*El sorteo se realizará en cuanto confirmes tu apuesta.*_ 🎫

_*¡Buena suerte y que disfrutes del juego! 🍀*_
`;
  return msn;
}

function MessageWelcomeKenno_2() {
  let msn = `¡Ahora es tu turno! 🌟
Ingresa los números con los que deseas jugar y ¡prepárate para ganar! 🏆
*_Recuerda seguir los consejos anteriores para una experiencia de juego óptima._*`;
  return msn;
}

function MessageWelcomeKenno_3(data) {
  let msn = `Ahora, por favor, ingresa el valor que deseas jugar. 💵

🔹 *Apuesta mínima: ${Utilitys.darFormatoMoneda(data[0].valor_minima_apuesta)}*
🔹 *Apuesta máxima: ${Utilitys.darFormatoMoneda(data[0].valor_maxima_apuesta)}*

*_🎯 ¡Recuerda! Seguir los consejos anteriores te ayudará a tener una experiencia de juego óptima. ¡Buena suerte! 🍀_*`;
  return msn;
}


function MessageWelcomeKenno_4(numeros,valor) {
  const list = `
-------------------------------------------------------      
*📄 Detalles de tu Apuesta 📄*
-------------------------------------------------------      
*NUMEROS ELEGIDOS\t: ${numeros.replace(',', '')}*
*VALOR DE LA APUESTA\t: ${Utilitys.darFormatoMoneda(valor)}*
-------------------------------------------------------`;
  return list;
}

function MessageWelcomeKenno_5() {
  let msn = `*¿Estás seguro(a) de que deseas realizar la apuesta? ❓💵*
  1️⃣. *SI*
  2️⃣. *NO*`
  return msn;
}

function MessageWelcomeKenno_Final(Numeros,valorApuesta,data) {
 // console.log('data>>>',data)
  let msn = `🎮 *Resultados* 🎮

📅 Fecha: *${data[0].fecha_apuesta}*
🎰 Números Apostados: *${Numeros}*
💰 Valor de la Apuesta: *${Utilitys.darFormatoMoneda(valorApuesta)}*
🎲 Resultados del Sorteo: *${data[0].numeros_sorteados}*
🎯 Cantidad de Aciertos: *${data[0].aciertos}*
🏆 Valor Ganado: *${Utilitys.darFormatoMoneda(data[0].valor_ganado)}*
💼 Saldo Final: *${Utilitys.darFormatoMoneda(data[0].saldo_final)}*

*¡Gracias por jugar, sigue apostando en tus números favoritos para más oportunidades de ganar.*

 *#Apuestas #JuegoResponsable*`
  return msn;
}


module.exports = {
  ListIconsNumber,
  CloseSession,
  MsnWelcomeRegister,
  MsnIngresaReferido,
  MsnWelcome,
  WelcomeImg,
  ListMain,
  InvalidGneric,
  InvalidGneric2,
  MessageSaldoClient,
  MessageQRsRecarga,
  MessageSelectLoteria,
  MessageInfoRifa,
  MsnListAdmin,
  MensageNumberClientAdmin,
  MensajeSaldoActualClientAdmin,
  MensageConfirmarRecargarSaldoClient_Admin,
  MensageReferido,
  MensageCantidaddeBoletasGenerar,
  MensageBonoGanador,
  MessageSearchFilterBoletas,
  MensageNumberClient,
  MessageVentaRifa,
  MessageConfirmarVentaBoleta,
  MessageWelcomeKenno,
  MessageWelcomeKenno_2,
  MessageWelcomeKenno_3,
  MessageWelcomeKenno_4,
  MessageWelcomeKenno_5,
  MessageWelcomeKenno_Final,
}