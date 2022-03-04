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

module.exports = {aplicaFondoReserva, avisosBajoConsumo, avisosCitas, cortePeriodo, marcaReciboEnviado, obtenDatosRecibos };