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
       obtenInformacionMensajes, marcaMensajeEnviado } = require("./procesos");

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
    console.log(new Date().toString() + " Corre proceso de aplicación del Fondo de Reserva");
    var res;
    aplicaFondoReserva(connection, {fecha: "2021-11-16"} ,result => {
        console.log("dentro de AplicaFondo");
        const logName = "FondoReserva_" + new Date().toString().split(" ").join("_")+".json";
        console.log(JSON.stringify(result));
        log.setItem(logName, JSON.stringify(result));
        //res.json(result);
    });
    
});

// Proceso de Corte del Periodo
cron.schedule('1 52,54,56,58 23 * * *',() => {
    console.log(new Date().toString() + " Corre proceso de corte Periodo");
    cortePeriodo(connection, {fecha: "2021-11-16"} ,result => {
        console.log("dentro de cortePeriodo");
        const logName = "CortePeriodo_" + new Date().toString().split(" ").join("_")+".json";
        console.log(JSON.stringify(result));
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
        }
    });


});

// -----------------------------------------------------------------
// Proceso de envio de comprobante de pago (no consumo)
// -----------------------------------------------------------------
cron.schedule('20 5 23 * * *',() => {
    console.log(new Date().toString() + " Corre proceso Obtener información para emision de recibos - email");
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
            // console.log("ELEMENT \n" + JSON.stringify(element));

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
    cron.schedule('0 */2 * * * *',() => {
        let ts = new Date();
        // console.log(new Date().toString() + " Corre proceso para notificaciones de Citas");
        console.log(ts.toString() + " Corre proceso para notificaciones de Citas");
        obtenInformacionMensajes(connection, {tipoNotifica: "1"} ,result => {
            console.log("dentro de obtenDatosCitas App");
            //const logName = "Citas_" + new Date().toString().split(" ").join("_")+".json";
            console.log(result);
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
                console.log(mailOptions);
                
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        //result.status(500).send(error.message);
                        console.log('Correo inválido' + err.message);
                    } else {
                        console.log("Correo enviado");
                        
                        marcaMensajeEnviado(connection, {IdMensaje: element.IdMensajeria } ,result => {
                            console.log("marcando notificación como enviado");
                            console.log(JSON.stringify(result));
                        
                        });
                    }
                });
            };
    
        });
    });
    
// ---------------------------------------------------------------------
// Proceso de envio de notificación de Citas de Instalación
// ---------------------------------------------------------------------

cron.schedule('0 */5 * * * *',() => {
    let ts = new Date();
    // console.log(new Date().toString() + " Corre proceso para notificaciones de Citas");
    console.log(ts.toString() + " Corre proceso para notificaciones de Citas de Instalación");
    obtenInformacionMensajes(connection, {tipoNotifica: "2"} ,result => {
        console.log("dentro de obtenDatosCitasInstalacion App");
        
        console.log(result);

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
            console.log(mailOptions);
            
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    //result.status(500).send(error.message);
                    console.log('Correo inválido' + err.message);
                } else {
                    console.log("Correo enviado");
                    
                    marcaMensajeEnviado(connection, {IdMensaje: element.IdMensajeria } ,result => {
                        console.log("marcando notificación como enviado");
                        console.log(JSON.stringify(result));
                    
                    });
                }
            });
        };

    });
});


// ---------------------------------------------------------------------
// Proceso de envio de notificación de Citas de Remoción del Convertidor
// ---------------------------------------------------------------------

cron.schedule('0 */6 * * * *',() => {
    let ts = new Date();
    // console.log(new Date().toString() + " Corre proceso para notificaciones de Citas");
    console.log(ts.toString() + " Corre proceso para notificaciones de Citas de Remoción");
    obtenInformacionMensajes(connection, {tipoNotifica: "2"} ,result => {
        console.log("dentro de obtenDatosCitasRemocion App");
        
        console.log(result);

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
                    console.log('Correo inválido' + err.message);
                } else {
                    console.log("Correo enviado");
                    
                    marcaMensajeEnviado(connection, {IdMensaje: element.IdMensajeria } ,result => {
                        console.log("marcando notificación como enviado");
                        console.log(JSON.stringify(result));
                    
                    });
                }
            });
        };

    });
});



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

