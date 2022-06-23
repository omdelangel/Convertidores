const express = require("express");
const app = express();
const mysql = require("mysql2");
var cron = require('node-cron');
const nodemailer = require("nodemailer");
const hbs = require('nodemailer-express-handlebars');
var dateFormat = require('dateformat');

require("dotenv").config();

const {aplicaFondoReserva, avisosBajoConsumo, avisosCitas, 
       cortePeriodo, marcaReciboEnviado, obtenDatosRecibos, 
       obtenInformacionMensajes, marcaMensajeEnviado, marcaCitasVencidas } = require("./procesos");

const log = require("./logs");
const { getMaxListeners } = require("./logs");
const { json } = require("express/lib/response");

// const dateFmt = require('dateformat');


app.use(express.json());

const connection = mysql.createConnection({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database : process.env.DBDATABASE,
    
});

/*-------------  Configuración para Mensajería SMS, WhatsApp  ----------------*/
const twClient = require('twilio')(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN); 
const twClientSms = require('twilio')(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN); 
/*-----------------------------------------------------------------------------*/

connection.connect((err) => {
    if(err) {
        console.log('HOST: ' + process.env.DBHOST +"; user: " + process.env.DBUSER + "; pwd: "+ process.env.DBPASSWORD +"; DB: " + process.env.DBDATABASE );
        throw err;
    }
      console.log("Connected to database: " + process.env.DBHOST+"/"+ process.env.DBDATABASE);
});

app.get("/", (req, res) => {
    res.send("Hola todos");
});

app.get("/aplicaFondoReserva", (req, res) => {
    aplicaFondoReserva(connection, {fecha: "2021-11-16"} ,result => {
        res.json(result);
    })
});

app.get("/cortePeriodo", (req, res) => {
    cortePeriodo(connection, {fecha: "2021-11-16"} ,result => {
        res.json(result);
    })
});

// Calendario de tareas que correrán en el servidor

// Proceso de Aplicacion Fondeo de Reserva
cron.schedule('1 53,55,57,59 23 * * *',() => {
    escribeLog("Corre proceso de aplicación del Fondo de Reserva");
    var res;
    aplicaFondoReserva(connection, {fecha: "2021-11-16"} ,result => {
        escribeLog("dentro de AplicaFondo");
        const logName = "FondoReserva_" + new Date().toString().split(" ").join("_")+".json";
        escribeLog(JSON.stringify(result));
        log.setItem(logName, JSON.stringify(result));
        //res.json(result);
    });
    
});

// Proceso de Corte del Periodo
cron.schedule('1 52,54,56,58 23 * * *',() => {
    escribeLog("Corre proceso de corte Periodo");
    cortePeriodo(connection, {fecha: "2021-11-16"} ,result => {
        escribeLog("dentro de cortePeriodo");
        const logName = "CortePeriodo_" + new Date().toString().split(" ").join("_")+".json";
        escribeLog(JSON.stringify(result));
        log.setItem(logName, JSON.stringify(result));
    });
});

// Proceso de vencimiento de citas

cron.schedule('58 59 23 * * *',() => {
    escribeLog("Corre proceso de vencimiento de citas");
    const cfecha = dateFormat(new Date(), "yyyy-mm-dd");
    marcaCitasVencidas(connection, {fecha: cfecha} ,result => {
        escribeLog("dentro de vencimiento de citas");
        const logName = "CitasVencidas_" + new Date().toString().split(" ").join("_")+".json";
        escribeLog(JSON.stringify(result));
        log.setItem(logName, JSON.stringify(result));
    });
});


var transporter = nodemailer.createTransport({
    //host: 'smtp.ethereal.email',
    port: process.env.PORTMAIL,
    service: process.env.SERVMAIL,
    
    secure: true,
    auth: {
        /*
        user: 'derrick.ullrich18@ethereal.email',
        pass: '3BmEwybjThfgQVvaXs'
        */
       user: process.env.USERMAIL,
       pass: process.env.PASSMAIL,
       
    },
});


transporter.use('compile', hbs({
    viewEngine: 'express-handlebars',
    defaultLayout: 'main',
    viewPath: './views/',
    extName: '.hbs',
    layoutDir: "views/layout",
    
}));

var mailOptions = {
    from: process.env.USERMAIL,
    to: "",
    subject: "Recibo de consumo ",
    template: 'recibo',
    context:{},
    attachments: [{
            filename: 'header-recibo@2x.png',
            path: __dirname +'\\img\\header-recibo@2x.png',
            cid: 'logo' 
        },
        {
            filename: 'header-recibo@2x.png',
            path: __dirname +'\\img\\footer recibo.png',
            cid: 'foot' 
        
        }
    ]

};



/*
// Proceso de envio de recibos
cron.schedule('20 5 23 * * *',() => {
    console.log(new Date().toString() + " Corre proceso Obtener información para emision de recibos - email");
    //console.log(`${BASE.URL}`);
    //let dia = dateFmt(new Date(), "yyyy-mm-dd");
    let dia = "2021-10-15";
    console.log(dia);

    obtenDatosRecibos(connection, {fecha: dia} ,result => {
        console.log("dentro de Notificaciones " + __dirname);
        const logName = "RecibosMail_" + new Date().toString().split(" ").join("_")+".json";
        console.log(result);
        var DatosRecibos = JSON.stringify(result);    
        let jsonParsedArray = JSON.parse(DatosRecibos);
        
        for (let index = 0; index < jsonParsedArray[0].length; index++) {
            const element = jsonParsedArray[0][index];
            
            mailOptions.to = element.email;  
            mailOptions.subject = "Recibo de consumo " + element.NumTicket;
            mailOptions.context = element;
            mailOptions.template = 'recibo'
            console.log(mailOptions);
            console.log("--------------------------------------");
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.log('Correo inválido' + err.message);
                } else {
                    console.log("Correo enviado");
                    marcaReciboEnviado(connection, {IdConsumo: element.Id } ,result => {
                        console.log("marcando consumo como notificado");
                        console.log(JSON.stringify(result));
                        //log.setItem(logName, JSON.stringify(result));
                    });
                }
            });
        }
    });


});
*/

// -----------------------------------------------------------------
// Proceso de envio de recibos
// -----------------------------------------------------------------
cron.schedule('20 5 23 * * *',() => {
    console.log(new Date().toString() + " Corre proceso Obtener información para emision de recibos - email");
    //console.log(`${BASE.URL}`);
    //let dia = dateFmt(new Date(), "yyyy-mm-dd");
    //let dia = "2021-10-15";
    //console.log(dia);

    obtenInformacionMensajes(connection, {tipoNotifica: "5"} ,result => {
        //obtenDatosRecibos(connection, {fecha: dia} ,result => {
        console.log("dentro de Notificaciones " + __dirname);
        const logName = "RecibosMail_" + new Date().toString().split(" ").join("_")+".json";
        console.log(result);
        var DatosRecibos = JSON.stringify(result);    
        let jsonParsedArray = JSON.parse(DatosRecibos);
        
        for (let index = 0; index < jsonParsedArray[0].length; index++) {
            const element = jsonParsedArray[0][index];
            
            mailOptions.to = element.Detalle.email;  
            mailOptions.subject = "Recibo de consumo " + element.Detalle.NumTicket;
            mailOptions.context = element.Detalle;
            mailOptions.template = 'recibo'
            console.log(mailOptions);
            console.log("--------------------------------------");
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.log('Correo inválido' + err.message);
                } else {
                    console.log("Correo enviado");
                    
                    marcaMensajeEnviado(connection, {IdMensaje: element.IdMensajeria } ,result => {
                        console.log("marcando notificación como enviado");
                        console.log(JSON.stringify(result));
                    
                    });
                }
            });

            const whatsBody =  '*COMPROBANTE DE CONSUMO* \n\n '+
                '*Concesionario:* '+element.Detalle.Concesionario + '\n'+ 
                '*Placas:* '+ element.Detalle.Placa +'\n'+
                '*Recibo:* '+ element.Detalle.NumTicket +'\n'+
                '*------------------------------------------*\n'+
                '*Litros:* '+ element.Detalle.Cantidad +'\n'+
                '*Precio:* '+ element.Detalle.PrecioGasLP +'\n'+
                '*Importe:* ' + element.Detalle.ImportePagar + '\n'+
                '*Ahorro Propietario:* '+ element.Detalle.ImporteAhorroPropietario +'\n'+ 
                '*Ahorro Concesionario:* '+ element.Detalle.ImporteAhorroConcesionario +'\n'
                '*Beneficios:* ' + element.Detalle.ImporteBeneficiosConversion +'\n';
                
                

            const smsBody =  'COMPROBANTE DE CONSUMO* \n\n '+
                'Concesionario: '+element.Detalle.Concesionario + '\n'+ 
                'Placas: '+ element.Detalle.Placa +'\n'+
                'Recibo: '+ element.Detalle.NumTicket +'\n'+
                '------------------------------------------\n'+
                'Litros: '+ element.Detalle.Cantidad +'\n'+
                'Precio: '+ element.Detalle.PrecioGasLP +'\n'+
                'Importe: ' + element.Detalle.ImportePagar + '\n'+
                'Ahorro Propietario: '+ element.Detalle.ImporteAhorroPropietario +'\n'+ 
                'Ahorro Concesionario: '+ element.Detalle.ImporteAhorroConcesionario +'\n'
                'Beneficios: ' + element.Detalle.ImporteBeneficiosConversion +'\n'
                

            console.log('Preparando envio de OMPROBANTE DE CONSUMO a celular: ' + element.Detalle.celular);
            enviaMensajesCel(element.Detalle.celular, whatsBody, smsBody );
        }
    });


});

// -----------------------------------------------------------------
// Proceso de envio de comprobante de pago (no consumo)
// -----------------------------------------------------------------
cron.schedule('20 5 23 * * *',() => {
    console.log(new Date().toString() + " Corre proceso Obtener información para emision de comprobantes de pago (No consumo) - email");
    //console.log(`${BASE.URL}`);
    //let dia = dateFmt(new Date(), "yyyy-mm-dd");
    //let dia = "2021-10-15";
    //console.log(dia);

    obtenInformacionMensajes(connection, {tipoNotifica: "8"} ,result => {
        //obtenDatosRecibos(connection, {fecha: dia} ,result => {
        console.log("dentro de Recibo de Pago Pendiente " + __dirname);
        const logName = "ReciboPagoMail_" + new Date().toString().split(" ").join("_")+".json";
        console.log(result);
        var DatosComprobante = JSON.stringify(result);    
        let jsonParsedArray = JSON.parse(DatosComprobante);
        
        for (let index = 0; index < jsonParsedArray[0].length; index++) {
            const element = jsonParsedArray[0][index];
            
            mailOptions.to = element.Detalle.email;  
            mailOptions.subject = "Recibo de Pago (No Condumo) " + element.Detalle.NumTicket;
            mailOptions.context = element.Detalle;
            mailOptions.template = 'reciboPagoPendiente'
            console.log(mailOptions);
            console.log("--------------------------------------");
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.log('Correo inválido' + err.message);
                } else {
                    console.log("Correo enviado");
                    
                    marcaMensajeEnviado(connection, {IdMensaje: element.IdMensajeria } ,result => {
                        console.log("marcando notificación como enviado");
                        console.log(JSON.stringify(result));
                    
                    });
                }
            });

            const whatsBody =  '*COMPROBANTE DE PAGO* \n\n '+
                '*Concesionario:* '+element.Detalle.Concesionario + '\n'+ 
                '*Placas:* '+ element.Detalle.Placa +'\n'+
                '*Recibo:* '+ element.Detalle.NumTicket +'\n'+
                '*------------------------------------------*\n'+
                '*Litros:* '+ element.Detalle.Cantidad +'\n'+
                '*Precio:* '+ element.Detalle.FactorPago +'\n'+
                '*Importe:* ' + element.Detalle.ImportePagar 
                

            const smsBody =  'COMPROBANTE DE PAGO \n\n '+
                'Concesionario: '+element.Detalle.Concesionario + '\n'+ 
                'Placas: '+ element.Detalle.Placa +'\n'+
                'Recibo: '+ element.Detalle.NumTicket +'\n'+
                '------------------------------------------\n'+
                'Litros: '+ element.Detalle.Cantidad +'\n'+
                'Precio: '+ element.Detalle.FactorPago +'\n'+
                'Importe: ' + element.Detalle.ImportePagar 
                

            console.log('Preparando envio de COMPROBANTE DE PAGO a celular: ' + element.Detalle.celular);
            enviaMensajesCel(element.Detalle.celular, whatsBody, smsBody );
        }
    });


});


// Proceso de envio de notificación por bajo consumo
/*
cron.schedule('22 * 23 * * *',() => {
    console.log(new Date().toString() + " Corre proceso para notificaciones");
    avisosBajoConsumo(connection, {fecha: "2021-11-04"} ,result => {
        console.log("dentro de obtenDatosNotificaciones App");
        const logName = "BajoConsumo_" + new Date().toString().split(" ").join("_")+".json";
        //console.log(result);
        //log.setItem(logName, JSON.stringify(result));

        var Datos = JSON.stringify(result);    
        let jsonParsedArray = JSON.parse(Datos);
        
        
        for (let index = 0; index < jsonParsedArray[0].length; index++) {
            const element = jsonParsedArray[0][index];

            mailOptions.to = element.email;
            mailOptions.subject = "Notificación de bajo consumo " ;
            mailOptions.template = 'bajo-consumo'
            mailOptions.context = element;
            console.log(mailOptions);
            
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    //result.status(500).send(error.message);
                    console.log('Correo inválido' + err.message);
                } else {
                    //result.status(200).json(req.body);
                    console.log("Correo enviado");
                    console.log(transporter.template);
                }
            });
        };

    });
});
*/
// -----------------------------------------------------------
// Proceso de envio de notificación por bajo consumo
// -----------------------------------------------------------

cron.schedule('5,35 * 19 * * *',() => {
    console.log(new Date().toString() + " Corre proceso para notificaciones por bajo consumo");
    obtenInformacionMensajes(connection, {tipoNotifica: "6"} ,result => {
        console.log("dentro de obtenDatosBajoConsumo App");
        const logName = "BajoConsumo_" + new Date().toString().split(" ").join("_")+".json";
        console.log(result);
        //log.setItem(logName, JSON.stringify(result));

        var Datos = JSON.stringify(result);    
        let jsonParsedArray = JSON.parse(Datos);
        // console.log("JSON PARSED \n" + jsonParsedArray);
        
        for (let index = 0; index < jsonParsedArray[0].length; index++) {
            var element = jsonParsedArray[0][index];

            mailOptions.to = element.Detalle.emailConcesionario;
            mailOptions.subject = "Notificación de bajo consumo " ;
            mailOptions.template = 'bajo-consumo'
            mailOptions.context = element.Detalle;
            console.log(mailOptions);
            
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    //result.status(500).send(error.message);
                    console.log('Correo inválido' + err.message);
                } else {
                    //result.status(200).json(req.body);
                    console.log("Correo enviado");
                    // console.log(transporter.template);

                    marcaMensajeEnviado(connection, {IdMensaje: element.IdMensajeria } ,result => {
                        console.log("marcando notificación como enviado");
                        console.log(JSON.stringify(result));
                        //log.setItem(logName, JSON.stringify(result));
                    });
                }
            });

            const whatsBody =  '*NOTIFICACIÓN DE BAJO CONSUMO* \n\n '+
                'Le informamos que el consumo de gas que ha realizado en el periodo, '+
                'se encuentra por debajo del promedio requerido para cumplir con el '+
                'consumo mensual pactado.\n\n'
                '*Consumo mensual pactado:* '+ element.Detalle.Cuota +'\n'+
                '*Consumo actual:* ' + element.Detalle.Consumo + '\n'+
                '*Consumo por cubrir:* '+ element.Detalle.Pendiente +'\n'+ 
                '*Ahorro Propietario:* ' + element.Detalle.AhorroPropietario +'\n'+
                '*Ahorro Concesionario:* '+ element.Detalle.AhorroConcesionario;
                

            const smsBody =  'NOTIFICACIÓN DE BAJO CONSUMO \n\n '+
                'Le informamos que presenta un adeudo por cumbistible "No consumido" conforme a la cuota establecida '+
                'en el contrato y que no logró cubrirse del ahorro acumulado.\n\n'
                'Consumo mensual pactado: '+ element.Detalle.Cuota +'\n'+
                'Consumo actual: ' + element.Detalle.Consumo + '\n'+
                'Consumo por cubrir: '+ element.Detalle.Pendiente +'\n'+ 
                'Ahorro Propietario: ' + element.Detalle.AhorroPropietario +'\n'+
                'Ahorro Concesionario: '+ element.Detalle.AhorroConcesionario ;
                

            console.log('Preparando envio de NOTIFICACIÓN DE BAJO CONSUMO a celular: ' + element.Detalle.celular);
            enviaMensajesCel(element.Detalle.celular, whatsBody, smsBody );
        };

    });
});

// ---------------------------------------------------------------------
// Proceso de envio de notificación por Adeudo de litros "No consumidos
// ---------------------------------------------------------------------

cron.schedule('5 */5 17 * * *',() => {
    console.log(new Date().toString() + " Corre proceso para notificaciones por adeudo de litros no consumidos");
    obtenInformacionMensajes(connection, {tipoNotifica: "7"} ,result => {
        console.log("dentro de obtenDatosAdeudoNoConsumo App");
        const logName = "AdeudoNoConsumo_" + new Date().toString().split(" ").join("_")+".json";
        console.log(result);
        //log.setItem(logName, JSON.stringify(result));

        var Datos = JSON.stringify(result);    
        let jsonParsedArray = JSON.parse(Datos);
        // console.log("JSON PARSED \n" + jsonParsedArray);
        
        for (let index = 0; index < jsonParsedArray[0].length; index++) {
            var element = jsonParsedArray[0][index];
            // console.log("ELEMENT \n" + JSON.stringify(element));

            mailOptions.to = element.Detalle.emailConcesionario;
            mailOptions.subject = "Notificación de adeudo por combustible no consumido " ;
            mailOptions.template = 'AdeudoNoConsumo'
            mailOptions.context = element.Detalle;
            console.log(mailOptions);
            
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.log('Correo inválido' + err.message);
                } else {
                    console.log("Correo enviado");

                    marcaMensajeEnviado(connection, {IdMensaje: element.IdMensajeria } ,result => {
                        console.log("marcando notificación como enviado");
                        console.log(JSON.stringify(result));

                    });
                }
            });

            const whatsBody =  '*NOTIFICACIÓN DE ADEUDO* \n\n '+
                'Le informamos que presenta un adeudo por cumbistible "No consumido" conforme a la cuota establecida '+
                'en el contrato y que no logró cubrirse del ahorro acumulado.\n\n'
                '*Consumo mensual pactado:* '+ element.Detalle.Cuota +'\n'+
                '*Consumo del periodo:* ' + element.Detalle.Consumo + '\n'+
                '*Litros cubiertos por el ahorro:* ' + element.Detalle.litrosAhorro +'\n'+
                '*Litros pendientes de cubrir:* '+ element.Detalle.LitrosNoConsumo +'\n\n'+ 
                '_Le solicitamos presentarse 15 mins. antes de su cita._';

            const smsBody =  'NOTIFICACIÓN DE ADEUDO \n\n '+
                'Le informamos que presenta un adeudo por cumbistible "No consumido" conforme a la cuota establecida '+
                'en el contrato y que no logró cubrirse del ahorro acumulado.\n\n'
                'Consumo mensual pactado: '+ element.Detalle.Cuota +'\n'+
                'Consumo del periodo: ' + element.Detalle.Consumo + '\n'+
                'Litros cubiertos por el ahorro: ' + element.Detalle.litrosAhorro +'\n'+
                'Litros pendientes de cubrir: '+ element.Detalle.LitrosNoConsumo +'\n\n'+ 
                'Le solicitamos presentarse 15 mins. antes de su cita.';

            console.log('Preparando envio de NOTIFICACIÓN DE ADEUDO a celular: ' + element.Detalle.celular);
            enviaMensajesCel(element.Detalle.celular, whatsBody, smsBody );

        };

    });
});


// Proceso de envio de notificación de Citas
//cron.schedule('0 */2 * * * *',() => {
/*    
cron.schedule('0 * * * * *',() => {
    let ts = new Date();
    // console.log(new Date().toString() + " Corre proceso para notificaciones de Citas");
    console.log(ts.toString() + " Corre proceso para notificaciones de Citas");
    avisosCitas(connection, {fecha: dateFormat(ts, "yyyy-mm-dd HH:MM:ss"), intervalo: 2} ,result => {
        console.log("dentro de obtenDatosCitas App");
        //const logName = "Citas_" + new Date().toString().split(" ").join("_")+".json";
        console.log(result);
        //log.setItem(logName, JSON.stringify(result));

        var Datos = JSON.stringify(result);    
        let jsonParsedArray = JSON.parse(Datos);
        
        
        for (let index = 0; index < jsonParsedArray[0].length; index++) {
            const element = jsonParsedArray[0][index];

            element.Fecha = dateFormat(element.Fecha, "dd/mm/yyyy HH:MM:ss")
            element.FechaRegistro = dateFormat(element.FechaRegistro, "dd/mm/yyyy HH:MM:ss")
            mailOptions.to = element.email;
            mailOptions.subject = "Cita Cambia y Gana " ;
            mailOptions.template = 'Cita'
            mailOptions.context = element;
            console.log(mailOptions);
            
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    //result.status(500).send(error.message);
                    console.log('Correo inválido' + err.message);
                } else {
                    //result.status(200).json(req.body);
                    console.log("Correo enviado");
                    console.log(transporter.template);
                }
            });
        };

    });
});
*/
// Proceso de envio de notificación de Citas
    cron.schedule('0 */1 * * * *',() => {
        //let ts = new Date();
        // console.log(new Date().toString() + " Corre proceso para notificaciones de Citas");
        escribeLog("Corre proceso para notificaciones de Citas");
        obtenInformacionMensajes(connection, {tipoNotifica: "1"} ,result => {
            escribeLog("dentro de obtenDatosCitas App");
            //const logName = "Citas_" + new Date().toString().split(" ").join("_")+".json";
            escribeLog(result);
            //log.setItem(logName, JSON.stringify(result));
    
            var Datos = JSON.stringify(result);    
            let jsonParsedArray = JSON.parse(Datos);
            
            
            for (let index = 0; index < jsonParsedArray[0].length; index++) {
                const element = jsonParsedArray[0][index];
                
                element.Fecha = dateFormat(element.Detalle.Fecha, "dd/mm/yyyy HH:MM:ss")
                element.FechaRegistro = dateFormat(element.Detalle.FechaRegistro, "dd/mm/yyyy HH:MM:ss")
                mailOptions.to = element.Detalle.email;
                mailOptions.subject = "Cita Cambia y Gana " ;
                mailOptions.template = 'Cita'
                mailOptions.context = element.Detalle;
                escribeLog(mailOptions);
                
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        //result.status(500).send(error.message);
                        escribeError('Correo inválido' + err.message);
                    } else {
                        escribeLog("Correo enviado");
                        
                        marcaMensajeEnviado(connection, {IdMensaje: element.IdMensajeria } ,result => {
                            escribeLog("marcando notificación como enviado");
                            escribeLog(JSON.stringify(result));
                        
                        });
                    }
                });

                const whatsBody =  '*CITA DE EVALUACIÓN* \n\n '+
                '*TALER:* '+ element.Detalle.Taller +'\n'+
                '*Domicilio:* ' + element.Detalle.Domicilio + '\n'+
                '*Num. Cita:* ' + element.Detalle.IdCita +'\n'+
                '*Fecha de la Cita:* '+ element.Detalle.Fecha +'\n\n'+ 
                '_Le solicitamos presentarse 15 mins. antes de su cita._';

                const smsBody =  'CITA DE EVALUACIÓN \n\n '+
                    'TALER: '+ element.Detalle.Taller +'\n'+
                    'Domicilio: ' + element.Detalle.Domicilio + '\n'+
                    'Num. Cita: ' + element.Detalle.IdCita +'\n'+
                    'Fecha de la Cita: '+ element.Detalle.Fecha +'\n\n'+ 
                    'Le solicitamos presentarse 15 mins. antes de su cita.';

                escribeLog('Preparando envio de CITA DE EVALUACIÓN a celular: ' + element.Detalle.celular);
                enviaMensajesCel(element.Detalle.celular, whatsBody, smsBody );

            };
        });
    });

    // ---------------------------------------------------------------------
    // Proceso de envio de notificación de Citas Canceladas
    // ---------------------------------------------------------------------

    cron.schedule('0 */2 * * * *',() => {
        let ts = new Date();
        // console.log(new Date().toString() + " Corre proceso para notificaciones de Citas");
        escribeLog("Corre proceso para notificaciones de Citas Canceladas");
        obtenInformacionMensajes(connection, {tipoNotifica: "10"} ,result => {
            escribeLog("dentro de obtenDatosCitasCanceladas App");
            
            escribeLog(result);
    
            var Datos = JSON.stringify(result);    
            let jsonParsedArray = JSON.parse(Datos);
            
            
            for (let index = 0; index < jsonParsedArray[0].length; index++) {
                const element = jsonParsedArray[0][index];
                
                element.Fecha = dateFormat(element.Detalle.Fecha, "dd/mm/yyyy HH:MM:ss")
                element.FechaRegistro = dateFormat(element.Detalle.FechaRegistro, "dd/mm/yyyy HH:MM:ss")
                mailOptions.to = element.Detalle.email;
                mailOptions.subject = "Cita Cambia y Gana CANCELADA " ;
                mailOptions.template = 'CitaCancela'
                mailOptions.context = element.Detalle;
                console.log(mailOptions);
                
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        //result.status(500).send(error.message);
                        escribeError('Correo inválido' + err.message);
                    } else {
                        escribeLog("Correo enviado");
                        
                        marcaMensajeEnviado(connection, {IdMensaje: element.IdMensajeria } ,result => {
                            escribeLog("marcando notificación como enviado");
                            escribeLog(JSON.stringify(result));
                        
                        });
                    }
                });

                const whatsBody =  '*CITA DE EVALUACIÓN CANCELADA* \n\n '+
                '*TALER:* '+ element.Detalle.Taller +'\n'+
                '*Domicilio:* ' + element.Detalle.Domicilio + '\n'+
                '*Num. Cita:* ' + element.Detalle.IdCita +'\n'+
                '*Fecha de la Cita:* '+ element.Detalle.Fecha +'\n\n'+ 
                '_Le informamos que su cita ha sido cancelada._';

                const smsBody =  'CITA DE EVALUACIÓN CANCELADA\n\n '+
                    'TALER: '+ element.Detalle.Taller +'\n'+
                    'Domicilio: ' + element.Detalle.Domicilio + '\n'+
                    'Num. Cita: ' + element.Detalle.IdCita +'\n'+
                    'Fecha de la Cita: '+ element.Detalle.Fecha +'\n\n'+ 
                    'Le informamos que su cita ha sido cancelada.';

                escribeLog('Preparando envio de CITA DE EVALUACIÓN CANCELADA a celular: ' + element.Detalle.celular);
                enviaMensajesCel(element.Detalle.celular, whatsBody, smsBody );

            };
        });
    });

    // ---------------------------------------------------------------------
    // Proceso de envio de notificación de Citas Reagendadas
    // ---------------------------------------------------------------------

    cron.schedule('0 */3 * * * *',() => {
        // console.log(new Date().toString() + " Corre proceso para notificaciones de Citas");
        escribeLog("Corre proceso para notificaciones de Citas Reagendadas");
        obtenInformacionMensajes(connection, {tipoNotifica: "11"} ,result => {
            escribeLog("dentro de obtenDatosCitasREagendadas App");
            
            escribeLog(result);
    
            var Datos = JSON.stringify(result);    
            let jsonParsedArray = JSON.parse(Datos);
            
            
            for (let index = 0; index < jsonParsedArray[0].length; index++) {
                const element = jsonParsedArray[0][index];
                
                element.Fecha = dateFormat(element.Detalle.Fecha, "dd/mm/yyyy HH:MM:ss")
                element.FechaRegistro = dateFormat(element.Detalle.FechaRegistro, "dd/mm/yyyy HH:MM:ss")
                mailOptions.to = element.Detalle.email;
                mailOptions.subject = "Cita Cambia y Gana Reagendada " ;
                mailOptions.template = 'CitaReagenda'
                mailOptions.context = element.Detalle;
                escribeLog(mailOptions);
                
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        //result.status(500).send(error.message);
                        escribeError('Correo inválido' + err.message);
                    } else {
                        escribeLog("Correo enviado");
                        
                        marcaMensajeEnviado(connection, {IdMensaje: element.IdMensajeria } ,result => {
                            escribeLog("marcando notificación como enviado");
                            escribeLog(JSON.stringify(result));
                        
                        });
                    }
                });

                const whatsBody =  '*CITA DE EVALUACIÓN REAGENDADA* \n\n '+
                '*TALER:* '+ element.Detalle.Taller +'\n'+
                '*Domicilio:* ' + element.Detalle.Domicilio + '\n'+
                '*Num. Cita:* ' + element.Detalle.IdCita +'\n'+
                '*Fecha de la Cita:* '+ element.Detalle.Fecha +'\n\n'+ 
                '_Le solicitamos presentarse 15 mins. antes de su cita._';

                const smsBody =  'CITA DE EVALUACIÓN REAGENDADA\n\n '+
                    'TALER: '+ element.Detalle.Taller +'\n'+
                    'Domicilio: ' + element.Detalle.Domicilio + '\n'+
                    'Num. Cita: ' + element.Detalle.IdCita +'\n'+
                    'Fecha de la Cita: '+ element.Detalle.Fecha +'\n\n'+ 
                    'Le solicitamos presentarse 15 mins. antes de su cita.';

                escribeLog('Preparando envio de CITA DE EVALUACIÓN REAGENDADA a celular: ' + element.Detalle.celular);
                enviaMensajesCel(element.Detalle.celular, whatsBody, smsBody );

            };
        });
    });


// ---------------------------------------------------------------------
// Proceso de envio de notificación de Citas de Instalación
// ---------------------------------------------------------------------

cron.schedule('0 */5 * * * *',() => {
    //let ts = new Date();
    // console.log(new Date().toString() + " Corre proceso para notificaciones de Citas");
    escribeLog(" Corre proceso para notificaciones de Citas de Instalación");
    obtenInformacionMensajes(connection, {tipoNotifica: "2"} ,result => {
        escribeLog("dentro de obtenDatosCitasInstalacion App");
        
        escribeLog(result);

        var Datos = JSON.stringify(result);    
        let jsonParsedArray = JSON.parse(Datos);
        
        for (let index = 0; index < jsonParsedArray[0].length; index++) {
            const element = jsonParsedArray[0][index];
            
            element.Fecha = dateFormat(element.Detalle.Fecha, "dd/mm/yyyy HH:MM:ss")
            element.FechaRegistro = dateFormat(element.Detalle.FechaRegistro, "dd/mm/yyyy HH:MM:ss")
            mailOptions.to = element.Detalle.email;
            mailOptions.subject = "Cita de instalación Cambia y Gana " ;
            mailOptions.template = 'CitaInstalacion'
            mailOptions.context = element.Detalle;
            escribeLog(mailOptions);
            
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    //result.status(500).send(error.message);
                    escribeError('Correo inválido' + err.message);
                } else {
                    escribeLog("Correo enviado");
                    
                    marcaMensajeEnviado(connection, {IdMensaje: element.IdMensajeria } ,result => {
                        console.log("marcando notificación como enviado");
                        console.log(JSON.stringify(result));
                    
                    });

                }
            });
            const whatsBody =  '*CITA DE INSTALACIÓN* \n\n '+
                '*TALER:* '+ element.Detalle.Taller +'\n'+
                '*Domicilio:* ' + element.Detalle.Domicilio + '\n'+
                '*Num. Cita:* ' + element.Detalle.IdCita +'\n'+
                '*Fecha de la Cita:* '+ element.Detalle.Fecha +'\n\n'+ 
                '_Le solicitamos presentarse 15 mins. antes de su cita._';

            const smsBody =  'CITA DE INSTALACIÓN \n\n '+
                'TALER: '+ element.Detalle.Taller +'\n'+
                'Domicilio: ' + element.Detalle.Domicilio + '\n'+
                'Num. Cita: ' + element.Detalle.IdCita +'\n'+
                'Fecha de la Cita: '+ element.Detalle.Fecha +'\n\n'+ 
                'Le solicitamos presentarse 15 mins. antes de su cita.';

            escribeLog('Preparando envio de CITA DE INSTALACIÓN a celular: ' + element.Detalle.celular);
            enviaMensajesCel(element.Detalle.celular, whatsBody, smsBody );
        };

    });
});


// ---------------------------------------------------------------------
// Proceso de envio de notificación de Citas de Remoción del Convertidor
// ---------------------------------------------------------------------

cron.schedule('0 */6 * * * *',() => {
    //console.log(new Date().format("yyyy-mm-dd HH:MM:ss l") + " Corre proceso para notificaciones de Citas de Remoción");
    escribeLog( "Corre proceso para notificaciones de Citas de Remoción");
    obtenInformacionMensajes(connection, {tipoNotifica: "2"} ,result => {
        //console.log("dentro de obtenDatosCitasRemocion App");
        escribeLog( "dentro de obtenDatosCitasRemocion App");
        
        //console.log(result);
        escribeLog(result);

        var Datos = JSON.stringify(result);    
        let jsonParsedArray = JSON.parse(Datos);
        
        for (let index = 0; index < jsonParsedArray[0].length; index++) {
            const element = jsonParsedArray[0][index];
            
            element.Fecha = dateFormat(element.Detalle.Fecha, "dd/mm/yyyy HH:MM:ss")
            element.FechaRegistro = dateFormat(element.Detalle.FechaRegistro, "dd/mm/yyyy HH:MM:ss")
            mailOptions.to = element.Detalle.email;
            mailOptions.subject = "Cita de Remoción Cambia y Gana " ;
            mailOptions.template = 'CitaDesinstala'
            mailOptions.context = element.Detalle;
            console.log(mailOptions);
            
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    //result.status(500).send(error.message);
                    //console.log('Correo inválido' + err.message);
                    escribeError('Correo inválido' + err.message);
                } else {
                    //console.log("Correo enviado");
                    escribeLog('Correo enviado');
                    
                    marcaMensajeEnviado(connection, {IdMensaje: element.IdMensajeria } ,result => {
                        //console.log("marcando notificación como enviado");
                        //console.log(JSON.stringify(result));
                        escribeLog("marcando notificación como enviado");
                        escribeLog(JSON.stringify(result));
                    
                    });
                }
            });

            const whatsBody =  '*CITA DE REMOCIÓN DE CONVERTIDOR* \n\n '+
                '*TALER:* '+ element.Detalle.Taller +'\n'+
                '*Domicilio:* ' + element.Detalle.Domicilio + '\n'+
                '*Num. Cita:* ' + element.Detalle.IdCita +'\n'+
                '*Fecha de la Cita:* '+ element.Detalle.Fecha +'\n\n'+ 
                '_Le solicitamos presentarse 15 mins. antes de su cita._';

            const smsBody =  'CITA PARA REMOCIÓN DE CONVERTIDOR\n\n '+
                'TALLER: '+ element.Detalle.Taller +'\n'+
                'Domicilio: ' + element.Detalle.Domicilio + '\n'+
                'Num. Cita: ' + element.Detalle.IdCita +'\n'+
                'Fecha de la Cita: '+ element.Detalle.Fecha +'\n\n'+ 
                'Le solicitamos presentarse 15 mins. antes de su cita.';

            //console.log('Preparando envio de CITA DE REMOCIÓN a celular: ' + element.Detalle.celular);
            escribeLog('Preparando envio de CITA DE REMOCIÓN a celular: ' + element.Detalle.celular)
            enviaMensajesCel(element.Detalle.celular, whatsBody, smsBody );
        };

    });
});


// ------------------------------------------------------------------------------
// Proceso de envio de notificación a Mesa de Autorización (Compliance) para los 
// casos de los Concesionarios que han completado la entrega de su documentación
// ------------------------------------------------------------------------------

cron.schedule('0 */1 * * * *',() => {
    //console.log(new Date().format("yyyy-mm-dd HH:MM:ss l") + " Corre proceso para notificaciones de Citas de Remoción");
    escribeLog( "Corre proceso para notificaciones a Mesas de Autorización (Compliance)");
    obtenInformacionMensajes(connection, {tipoNotifica: "12"} ,result => {
        //console.log("dentro de obtenDatosCitasRemocion App");
        escribeLog( "dentro de obtenDatosMensajeCompliance");
        
        
        var Datos = JSON.stringify(result);    
        let jsonParsedArray = JSON.parse(Datos);
        

        
        for (let index = 0; index < jsonParsedArray[0].length; index++) {
            const element = jsonParsedArray[0][index];
            escribeLog('Elemento: ' + element);   
            element.Fecha = dateFormat(element.Detalle.Fecha, "dd/mm/yyyy HH:MM:ss")
            
            mailOptions.to = element.Detalle.email;
            mailOptions.subject = "Notificación de Documentación Completa " ;
            mailOptions.template = 'DocumentacionCompleta'
            mailOptions.context = element.Detalle;
            console.log(mailOptions);
            
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    escribeError('Correo inválido' + err.message);
                } else {
                    escribeLog('Correo enviado');
                    
                    marcaMensajeEnviado(connection, {IdMensaje: element.IdMensajeria } ,result => {
                        escribeLog("marcando notificación como enviado");
                        escribeLog(JSON.stringify(result));
                    });
                }
            });

            escribeLog('SMS Habilitado: ' + process.env.SMS_ENABLED);
            escribeLog('WHATSAPP Habilitado: ' + process.env.WHATSAPP_ENABLED);

            if (process.env.SMS_ENABLED || process.env.WHATSAPP_ENABLED) {
                const whatsBody =  '*NOTIFICACIÓN DE DOCUMENTACION COMPLETA* \n\n '+
                    '*Concecionario:* '+ element.Detalle.Concesionario +'\n'+
                    '*Vehículo:* ' + element.Detalle.Vehiculo + '\n'+
                    '*Placas:* ' + element.Detalle.Placa + '\n'+
                    '*Síndicato:* ' + element.Detalle.Sindicato +'\n'+
                    '*Fecha de entrega:* '+ element.Detalle.Fecha +'\n\n'+ 
                    '_Para su conocimiento a fin de proceder con la validación de la documentación._';

                const smsBody =  'NOTIFICACIÓN DE DOCUMENTACION COMPLETA\n\n '+
                    'Concecionario: '+ element.Detalle.Concesionario +'\n'+
                    'Vehículo: ' + element.Detalle.Vehiculo + '\n'+
                    'Placas: ' + element.Detalle.Placa + '\n'+
                    'Síndicato: ' + element.Detalle.Sindicato +'\n'+
                    'Fecha de entrega: '+ element.Detalle.Fecha +'\n\n'+ 
                    'Para su conocimiento a fin de proceder con la validación de la documentación.';

                escribeLog('Preparando envio de NOTIFICACIÓN DE DOCUMENTACION COMPLETA a celular: ' + element.Detalle.celular)
               enviaMensajesCel(element.Detalle.celular, whatsBody, smsBody );
            }
        };

    });
});


/*-------------------------------------------------------------------------------
//                     Envia mensajes Cel
/*-------------------------------------------------------------------------------*/
function enviaMensajesCel (celNumber , whatsBody , smsBody ) {
    
    if (process.env.WHATSAPP_ENABLED==true) {
         
        twClient.messages
        .create({
                    body: whatsBody,
                    from: process.env.WHATSAPP_SENDER,   //'whatsapp:+14155238886',
                    to: 'whatsapp:+521' + celNumber
                }) 
        .then(message => escribeLog('WhatsApp ID : ' + message.sid +' '+ message.status))
        .catch(e => escribeError('Mensaje WhatsApp no enviado: '+ e)) 
        .done();
    }
    
    if (process.env.SMS_ENABLED==true) {
        twClientSms.messages
        .create({
                    body: smsBody,
                    from: process.env.SMS_SENDER,
                    statusCallback: 'http://8256-200-194-5-98.ngrok.io/status-msg',
                    to: '+521'+ celNumber
                })
        .then(message => escribeLog('SMS ID '+ message.sid+' '+ message.status))
        .catch(e => escribeError('Mensaje SMS no enviado: '+ e));
        
    }
}

function escribeLog(mensaje) {
    ts = new Date();
    console.log( dateFormat(ts, "yyyy-mm-dd HH:MM:ss l") + " - " + mensaje);
}

function escribeError(error) {
    ts = new Date()
    console.error( dateFormat(ts, "yyyy-mm-dd HH:MM:ss l") + " - " + error);
}
//--------------------------------------------------------------------------------//

app.listen(3000, () => {
    console.log("Servidor en el puerto 3000");
});



        /*
        for (var obj in jsonParsedArray) {
            var jsonObj = jsonParsedArray[obj];
            for (var elem in jsonObj) {
                console.log(obj + ' - ' + ':' + jsonObj[elem].NumTicket);
            }
        }
*/
        /*
        for (var data in jsonParsedArray) {

           if (jsonParsedArray.hasOwnProperty(data)) {
                console.log("Key: " + data + ", value: " + jsonParsedArray[data]);
           } 
        
        }
        */

