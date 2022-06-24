const mysql = require('mysql2');


function aplicaFondoReserva(connection, data, callback) {
    let spSQL = "Call spAplicaFondoReserva(?)";
    let query =mysql.format(spSQL, [data.fecha])
    console.log("procesos.aplicaFondoReserva");
    connection.query(query, function(err, result) {
        if (err) throw err;
        callback(result);
    });
}

function cortePeriodo(connection, data, callback) {
    let spSQL = "Call spCortePeriodo(?)";
    let query =mysql.format(spSQL, [data.fecha])
    connection.query(query, function(err, result) {
        if (err) throw err;
        callback(result);
    });
}

function obtenDatosRecibos(connection, data, callback) {
    let spSQL = "Call spConsumosParaRecibos(?)";
    let query =mysql.format(spSQL, [data.fecha])
    console.log(query);
    
    connection.query(query, function(err, result) {
        if (err) throw err;
        callback(result);
    });
}

function avisosBajoConsumo(connection, data, callback) {
    let spSQL = "Call spAvisosBajoConsumo(?)";
    let query =mysql.format(spSQL, [data.fecha])
    console.log(query);
    
    connection.query(query, function(err, result) {
        if (err) throw err;
        callback(result);
    });
}

function avisosCitas(connection, data, callback) {
    let spSQL = "Call spAvisosCitas(?,?)";
    let query =mysql.format(spSQL, [data.fecha, data.intervalo])
    console.log(query);
    
    connection.query(query, function(err, result) {
        if (err) throw err;
        callback(result);
    });
}

function marcaReciboEnviado(connection, data, callback) {
    let spSQL = "Call spMarcaConsumoNotificado(?)";
    let query =mysql.format(spSQL, [data.IdConsumo])
    console.log(query);
    
    connection.query(query, function(err, result) {
        if (err) throw err;
        callback(result);
    });
}

function obtenInformacionMensajes(connection, data, callback) {
    let spSQL = "Call spObtenInformacionMensajes(?)";
    let query =mysql.format(spSQL, [data.tipoNotifica])
    console.log(query);
    
    connection.query(query, function(err, result) {
        if (err) throw err;
        callback(result);
    });
}

function marcaMensajeEnviado(connection, data, callback) {
    let spSQL = "Call spMarcaMensajeEnviado(?)";
    let query =mysql.format(spSQL, [data.IdMensaje])
    console.log(query);
    
    connection.query(query, function(err, result) {
        if (err) throw err;
        callback(result);
    });
}

function marcaCitasVencidas(connection, data, callback) {
    let spSQL = "Call spVenceCitas(?)";
    let query =mysql.format(spSQL, [data.fecha])
    console.log(query);
    
    connection.query(query, function(err, result) {
        if (err) throw err;
        callback(result);
    });
}

function obtenEdoCtaResumen( connection, params, callback) {
    console.log('connection: ' + connection);
    console.log('Params: ' + JSON.stringify(params));
    let spSQL = "Call spEdoCtaResumen(Date(?))";
    console.log('Fecha: ' + params.fecha);
    let query =mysql.format(spSQL, [params.fecha]);
    console.log("query: " + query);
    connection.query(query, function(err, result) {
        if (err) {
            console.log(err);
            throw err;

        }
        callback(result);
    });
    
}

function obtenEdoCtaMovimientos( connection, data, callback) {
    let spSQL = "Call spEdoCtaMovimientos(?, Date(?))";
    let query =mysql.format(spSQL, [data.contrato, data.fecha])
    console.log("query: " + query);
    connection.query(query, function(err, result) {
        if (err) throw err;
        return callback(result);
    });
}


module.exports = {
    aplicaFondoReserva, 
    avisosBajoConsumo, 
    avisosCitas, 
    cortePeriodo, 
    marcaReciboEnviado, 
    obtenDatosRecibos, 
    obtenInformacionMensajes,
    marcaMensajeEnviado,
    marcaCitasVencidas ,
    obtenEdoCtaResumen,
    obtenEdoCtaMovimientos
};
