const Services = require('../api/components/chatbot_v3_t/index');

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function cleanNumberAndMessage(msg) {
  return new Promise(function (resolve) {
    //return texto.normalize('NFD').replace(/[\u0300-\u036f]/g,"");
    let numberfrom = msg.from.id;
    let numberto =   msg.botInfo.id;
    
    resolve([msg.message.text.toLowerCase(), numberfrom, numberto]);
  });
}


function quitarIndicativo(numero,indicativo_pais) {
  let numeroStr = numero.toString();
  let indicativo =indicativo_pais.toString();
  if (numeroStr.startsWith(indicativo)) {
      return numeroStr.slice(indicativo.length);
  }
  return numeroStr;
}


function SearchListNumber(miString, numeroBuscado) {
  const numeros = miString.split(',').map(item => parseInt(item.trim(), 10));

  if (numeroBuscado.includes('-')) {
    const arrayResultante = numeroBuscado.split('-');

    for (const num of arrayResultante) {
      const trimmedNum = num.trim();

      if (trimmedNum === "") {
        return false;
      }

      const numero = parseInt(trimmedNum, 10);

      if (isNaN(numero)) {
        return false;
      }

      if (!numeros.includes(numero)) {
        return false;
      }
    }

    return true;
  } else {
    const numero = Number(numeroBuscado.trim());

    if (isNaN(numero)) {
      return false;
    }

    return numeros.includes(numero);
  }
}

function darFormatoMoneda(numeroString) {
  const numero = parseFloat(numeroString);
  const simboloMoneda = "$";
  const cantidadDecimales = 0;
  const numeroFormateado = numero.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: cantidadDecimales,
  });
  return numeroFormateado;
}



function agregarComillasACadena(cadena) {
  const numerosConComillas = cadena.split('-').map(numero => `'${numero}'`);

  const cadenaConComillas = numerosConComillas.join(',');

  return cadenaConComillas;
}

function imagePath(response_session, response_config_producto) {
  const fileName = `${response_session[0].empresa}_${response_config_producto[0].id}.png`;

  const basePath = path.join(__dirname, '..', 'img', response_session[0].empresa);

  const pngPath = path.join(basePath, fileName);
  if (path.extname(pngPath) === '.png' && fs.existsSync(pngPath)) {
    return pngPath; 
  }

  const jpgPath = path.join(basePath, `${fileName.replace('.png', '.jpg')}`);
  if (fs.existsSync(jpgPath)) {
    return jpgPath; 
  }

  const jpegPath = path.join(basePath, `${fileName.replace('.png', '.jpeg')}`);
  if (fs.existsSync(jpegPath)) {
    return jpegPath; 
  }
  console.warn(`No se encontró la imagen ${fileName}`);
  return null; 
}
///###################################


async function GenerarReciboPDF(response_data_emp, response_session, response_config_producto, response_generic,response_config_msn_tirilla) {
  try {
    let sizex = 612;
    let sizey = 550;
  //  console.log('Session>>>',response_session)

    const nombreArchivo = path.join(__dirname, '..', 'temp', `${response_generic[0].nano}.pdf`);

    const doc = new PDFDocument({ size: [sizex, sizey] });
    doc.pipe(fs.createWriteStream(nombreArchivo));

     const imgPath = imagePath(response_session,response_config_producto);
     doc.image(imgPath, 0, 0, { width: 612, height: 550, opacity: 0.1 });
    doc.moveDown(13);

    doc.font('Helvetica-Bold').fontSize(15);
    doc.text(`FECHA SORTEO : ${response_config_producto[0].fecha_sorteo}`, { align: 'center' });

    doc.font('Helvetica-Bold').fontSize(15);
    doc.text(`${response_config_producto[0].nombre_loteria}`, { align: 'center' });

    doc.font('Helvetica-Bold').fontSize(15);
    doc.text(`VENDIDO: ${response_generic[0].fecha_venta}`, { align: 'center' });

    doc.font('Helvetica').fontSize(15);
    doc.text(`${response_generic[0].nano}`, { align: 'center' });
    doc.moveDown();
    let split = response_session[0].data.split(',');
    doc.font('Helvetica').fontSize(35);
    doc.text(`${split[0]}`, { align: 'center' });
    //doc.moveDown();

    doc.fillColor('gray');
    doc.font('Helvetica').fontSize(8);

    doc.text(`${response_generic[0].cifrado.replace('\\xc30d04070302','')}`, { align: 'center' });
    doc.fillColor('black');
    doc.end();
    await new Promise((resolve) => setTimeout(resolve, 2000));
   
    return true;
  } catch (error) {

    console.log(`Error PDF generado: ${error}`);
    return false;
  }

}


async function GenerarReciboPDFEdit(response_data_emp, response_session, response_config_producto, response_generic,response_config_msn_tirilla) {
  try {

    let sizex = 612;
    let sizey = 550;

    const nombreArchivo = path.join(__dirname, '..', 'temp', `${response_generic[0].nano}.pdf`);
    const doc = new PDFDocument({ size: [sizex, sizey] });
    doc.pipe(fs.createWriteStream(nombreArchivo));

     const imgPath = imagePath(response_session,response_config_producto);
     doc.image(imgPath, 0, 0, { width: response_config_msn_tirilla[0].img_width, height: response_config_msn_tirilla[0].img_heigth, opacity: Number(response_config_msn_tirilla[0].img_opacity) });
    
    let split = response_session[0].data.split(',');

    for (let i = 0; i < response_config_msn_tirilla[0].space_init; i++) {
     doc.moveDown();
    }

    doc.fillColor(response_config_msn_tirilla[0].font_color);
    doc.font('Helvetica').fontSize(35);
    doc.text(`${addSpaces(split[0],response_config_msn_tirilla[0].left_space_init,response_config_msn_tirilla[0].right_space_init)}`, { align: response_config_msn_tirilla[0].align});
    doc.font('Helvetica').fontSize(8);
    doc.text(`${response_generic[0].cifrado.replace('\\xc30d04070302','')}`, { align: response_config_msn_tirilla[0].align });
   
    doc.end();
    await new Promise((resolve) => setTimeout(resolve, 2000));
   
    return true;
  } catch (error) {

    console.log(`Error PDF generado: ${error}`);
    return false;
  }

}

async function SearcMultiNumber(cadena, max_length, id_rifa ,loteria ,min_cantidad_venta) {
  if (!cadena || cadena.trim() === '' || cadena.endsWith('-')) {
    return 'la cadena está vacía o incompleta';
  }

  const limitemax = 10;

  const numeros = cadena.replace(/\s/g, '').split('-');

  const regex = new RegExp(`^\\d{${max_length},${max_length}}$`);

  const numerosUnicos = new Set();
  for (const numero of numeros) {

    if (!regex.test(numero)) {
      return `el elemento '*${numero}*' no es un número válido de *${max_length}* cifras`;
    }

    if (numero === '') {
      return 'no se permiten guiones vacíos después de otro guión';
    }

    if (numerosUnicos.has(numero)) {
      return `el número '*${numero}*' está repetido en la cadena`;
    }

    if(numeros.length > limitemax){
      return `el número maximo de numeros a tomar es de *${limitemax}*`;
    }

    if (numeros.length < Number(min_cantidad_venta)) {
      return `El número mínimo de números a vender es de *${min_cantidad_venta}*`;
    } 
    

    numerosUnicos.add(numero);
  }

  let total ;
  if(loteria == 0){
    total = await Services.ctr.ConsultBoletaIsVenta(id_rifa, agregarComillasACadena(cadena),0,0);
  }else{
    total = await Services.ctr.ConsultBoletaIsVentaxLoteria(id_rifa, agregarComillasACadena(cadena),0,loteria);
  }
  const numerosVendidos = total.map(item => item.numero_vendido);
  const numerosVendidosString = numerosVendidos.join(', ');
  if (total.length == 1) {
    return `el número '*${numerosVendidosString}*' ya esta vendido`;
  } else if (total.length > 1) {
    return `los números '*${numerosVendidosString}*' ya estan vendidos`;
  }

  return true;
}


async function SearcMultiNumberKenno(cadena, cantidad_minima_numeros_parilla, cantidad_maxima_numeros_parilla, cifras_numero_en_parilla,rango_minimo_numeros_x_sorteo,rango_maximo_numeros_x_sorteo) {

  
  if (!cadena || cadena.trim() === '' || cadena.endsWith('-')) {
    return 'La cadena está vacía o incompleta';
  }

  const limitemax = cantidad_maxima_numeros_parilla;
  const limitemin = cantidad_minima_numeros_parilla;
  const rangoMin = rango_minimo_numeros_x_sorteo;
  const rangoMax = rango_maximo_numeros_x_sorteo;

  const numeros = cadena.replace(/\s/g, '').split('-');

  if (numeros.length > limitemax) {
    return `El límite máximo de números en la parrilla es de *${limitemax}*`;
  }

  if (numeros.length < limitemin) {
    return `El límite mínimo de números en la parrilla es de *${limitemin}*`;
  }

  const regex = new RegExp(`^\\d{${cifras_numero_en_parilla}}$`);
  const numerosUnicos = new Set();

  for (const numero of numeros) {
    if (!regex.test(numero)) {
      return `El elemento '*${numero}*' no es un número válido de *${cifras_numero_en_parilla}* cifras`;
    }

    const num = parseInt(numero, 10);
    if (num < rangoMin || num > rangoMax) {
      return `El número '*${numero}*' está fuera del rango permitido entre *${rangoMin} y ${rangoMax}*`;
    }

    if (numerosUnicos.has(numero)) {
      return `El número '*${numero}*' está repetido en la cadena`;
    }

    numerosUnicos.add(numero);
  }

  return true;
}



function calculaValor(numeros, valorunit) {

  let total = 0;
  const cadena = numeros.split('-');
  for (i = 0; i < cadena.length; i++) {
    total = total + parseInt(valorunit);
  }

  return total;
}

function agregarCero(numero) {
  var cadenaNumero = numero.toString();
  if (cadenaNumero.length === 1) {
    cadenaNumero = "0" + cadenaNumero;
  }
  return cadenaNumero;
}



function formatearFecha(fecha) {
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // Los meses en JavaScript son 0-indexados
  const anio = fecha.getFullYear();
  
  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const segundos = String(fecha.getSeconds()).padStart(2, '0');
  
  return `${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}`;
}

function validateFormat93(input) {
  // Expresión regular para validar el formato
  const regex = /^\d+-(@\S+)?$/;
  // Comprobar si el input coincide con el regex
  return regex.test(input);
}

module.exports = {
  cleanNumberAndMessage,
  quitarIndicativo,
  SearchListNumber,
  darFormatoMoneda,
  agregarComillasACadena,
  GenerarReciboPDF,
  GenerarReciboPDFEdit,
  SearcMultiNumber,
  calculaValor,
  SearcMultiNumberKenno,
  agregarCero,
  formatearFecha,
  validateFormat93,
  
}


 


