var _ = require('underscore');
var dateFormat = require('dateformat');

//const resumenColumns=["IdContrato", "IdConcesionario", "NumeroConcesion", "Concesionario", "Domicilio", "FechaInicio", "FechaTermino", "ConsumoTotal", "ConsumoMes", "Periodos", "IdSindicato", "Sindicato", "TipoConvertidor", "Convertidor", "Vehiculo", "Placa", "VIN", "TipoVehiculo", "Propetario", "IdAsignacionSindicato", "AhorroConcesionario", "AhorroPropietario", "ImporteBeneficiosConversion", "LitrosConsumidos", "LitrosXConsumir"];
const movimientosColumns = [{text: 'Estacion', style: 'tableHeader'}, 'FechaConsumo', 'TipoMovimiento', 'NumTicket', 'Cantidad', 'PrecioGasLP', 'ImportePagar', 'ImporteBeneficiosConversion', 'ImporteAhorroConcesionario', 'ImporteAhorroPropietario', 'Kilometraje'];

class pdfDocument {
    /*
    constructor (params ) {
        console.log("pdfDocument Constructor : " + JSON.stringify(params));
        obtenEdoCtaResumen(params, result => {
            this.data.json(result);
        });
        console.log("pdfDocument Constructor: " + JSON.stringify(this.data));
    };
    */
    constructor (pContrato, pMovimientos ) {
        this.contrato = pContrato;
        this.movimientos = pMovimientos;
        this.jMovs = JSON.parse(JSON.stringify(pMovimientos));
        this.columnsMovs = [['FechaConsumo', 'Estacion', 'TipoMovimiento', 'NumTicket', 'Cantidad', 'PrecioGasLP', 'ImportePagar', 'ImporteBeneficiosConversion', 'ImporteAhorroConcesionario', 'ImporteAhorroPropietario'],
                            [{text: 'Fecha', style: 'tableHeader'}, 
                             {text: 'Estación', style: 'tableHeader'}, 
                             {text: 'Conc.', style: 'tableHeader'}, 
                             {text: 'Ticket', style: 'tableHeader'}, 
                             {text: 'Cantidad', style: 'tableHeader'}, 
                             {text: 'Precio GLP', style: 'tableHeader'}, 
                             {text: 'Importe Pago', style: 'tableHeader'}, 
                             {text: 'Beneficios $', style: 'tableHeader'}, 
                             {text: 'Ahorro Conceción', style: 'tableHeader'}, 
                             {text: 'Ahorro Propietario', style: 'tableHeader'}]];
        console.log("Constructor: " + JSON.stringify(this.columnsMovs));

        this.operadores = _.keys(_.countBy(this.jMovs[0], function(data) { 
        //    console.log("- data: " + JSON.stringify(data));
            return data.Operador; 
        }));
        console.log("_______________________________________________________");
        //console.log(JSON.stringify(this.jMovs[0]));
        console.log(JSON.stringify(this.operadores));

    };

    getPdfContent() {
        this.content = [
            {image: "img/logo-cambia-250px.jpg", alignment:"center"},
            {text: "\n\nEstado de cuenta\n\n", style: "header", alignment: "center"}   ,         
     
            {
                alignment: 'justify',
                columns: [
                {
                    table: {
                        header: 0,
                        body: [
                            [{
                                style: 'tableExample',
                                table: {
                                    headerRows: 0,
                                    body: [
                                        [{text: "Cambia y Gana\n\n", style: "header"},],
                                        [{text: "Domicilio de las oficinas generales", style: "subheader"},],
                                        [{text: "R.F.C CONV34234242423 \n\n", style: "subheader"},],
                                    ]
                                },
                                layout: 'noBorders',
                            }],
                            
                            [
                                {                
                                    style: 'tableExample',
                                    table: {
                                        headerRows: 0,
                                        body: [
                                            [{text: this.contrato.Concesionario, style: "subheader"}],
                                            [{text: this.contrato.Domicilio, style: "subheader"}],
                                            //[{text: "COL. NAVIDAD, CUAJIMALPA ", style: "subheader"}],
                                            //[{text: "05219 MEXICO, CDMX 05501 ", style: "subheader"},],
                                            
                                        ]
                                    },
                                    layout: 'headerLineOnly',
                                },
                            ],
                                                        
                            [{text: "R.F.C " + this.contrato.RFC,  style:"subheader", }]
                            
                        ]
                    },
                    layout: 'noBorders', 
                    
                }, 
                {
                
                    style: 'tableExample',
                    table: {
                        widths: [100, '*'],
                        headerRows: 1,
                        body: [
                            [{text: "Resumen de ahorro", style: "tableHeader", colSpan: 2, alignment: 'center', color: '#7CBE02', fillColor: '#011D7E'},{}],
                            [{text: "Concesionario", style: "subheader"},{text: this.contrato.NumConcesion, style: "label", alignment: "right", fontSize: 10},],
                            [{text: "Ahorro Concesionario", style: "subheader"},{text: this.contrato.AhorroConcesionario, style: "label", alignment: "right", fontSize: 10},],
                            [{text: "Ahorro Propietario ", style: "subheader"},{text: this.contrato.AhorroPropietario, style: "label", alignment: "right", fontSize: 10},],
                            [{text: "Beneficios ", style: "subheader"},{text: this.contrato.ImporteBeneficiosConversion, style: "label", alignment: "right", fontSize: 10},],
                            [{text: "Adeudo (Lts)", style: "subheader"},{text: this.contrato.LitrosXConsumir, style: "label", alignment: "right", fontSize: 10},],
                        ]
                    },
                    layout: 'headerLineOnly',
                },
            
            ]}, 
            
            {
                //style: 'tableExample',
                
                table: {
                    headerRows: 0,
                    body: this.getOperadorSection()
                    /*[
                        
                        [{ text: "MOVIMIENTOS DEL MES", style: "header", alignment: "center", fillColor: "#eeffee"}],
                        [{text: "OPERADOR: " + this.contrato.Propietario}],
                        
                        [
                            //Armado dinámico de la tabla de movimientos
                            this.getMovsTable(this.movimientos[0], this.columnsMovs ), 
                        ]
                        
                       
                    ]
                    */
                },
                layout: 'noBorders',
            }
        ]
               
        return this.content;
    }

    getOperadorSection() {
        var operadorData = [];
        /*
        this.operadores.forEach(function (row){
            operadorData.push({text: "OPERADOR",  row, });
            operadorData.push([this.getMovsTable(this.movimientos[0], this.columnsMovs )] );

        });
        */
       operadorData.push([{ text: "MOVIMIENTOS DEL MES", style: "header", alignment: "center", color: '#7CBE02', fillColor: '#011D7E'}],)
        for (let i=0; i< this.operadores.length; i++) {
            console.log(" - " + i + " de " + this.operadores.length );
            operadorData.push(JSON.parse('[{ "text" : "OPERADOR: '+ this.operadores[i] +'"}]'),);
            operadorData.push([this.getMovsTable(this.movimientos[0], this.columnsMovs )], );
        }
        console.log (JSON.stringify(operadorData));
        return operadorData;
        
    }

    getMovsTable(data, columns) {
        //console.log("--------------- getMovsTable------------------");
        //console.log(JSON.stringify(data));
        console.log("--------------- getMovsTable Columns------------------");
        console.log(JSON.stringify(columns));
        return {
            style: 'tableDetail',
            widths: ['35', '70', '40', '50', '40', '40', '40', '40', '40', '40', '50'],
            table: {
                headerRows: 1,
                body: this.buildTableBody(data, columns)
            },
            layout: {
                fillColor: function (rowIndex, node, columnIndex) {
                    return (rowIndex>0 && rowIndex % 2 === 0) ? '#CCCCCC' : null;
                },
            }
        }

    }   

    buildTableBody(data, columns) {
        var body = [];
        var tCantidad = 0.0;
        var tPago = 0.0;
        var tBeneficios = 0.0;
        var tAConcesion = 0.0;
        var tAPropietario = 0;
        
    
        body.push(columns[1]);
        //console.log(columns.toString() ) ;
        data.forEach(function(row) {
            var dataRow = [];
            //console.log("------Row-------")
            //console.log(JSON.stringify(row));
            columns[0].forEach(function(column, index) {
              //  console.log("------Column-------")
              //  console.log(column);
            //  if ( index === 0 ) {
            //    console.log("Fecha: " + dateFormat(row[column], "dd/mm/yyyy hh24:MM:ss"));
            //  }
            dataRow.push({ text: (index === 0 ? dateFormat(row[column], "dd/mm/yyyy h:MM:ss") : row[column]), fontSize : 8 })  ;
            })
            tCantidad += parseFloat(row['Cantidad']);
            tPago += parseFloat(row['ImportePagar']);
            tBeneficios += parseFloat(row['ImporteBeneficiosConversion']);
            tAConcesion += parseFloat(row['ImporteAhorroConcesionario']);
            tAPropietario += parseFloat(row['ImporteAhorroPropietario']);
            //console.log("cantidad : "+tCantidad);
            
            body.push(dataRow,);
        });
        
        body.push([{"text": "", style: 'tableHeader'},{"text": "", style: 'tableHeader'},
                   {"text": "Totales del periodo",  style: 'tableHeader', bold: true, colSpan: "2"}, 
                   {"text": ""},
                   {"text": tCantidad, style: 'tableHeader', bold: true, alignment: 'right'},
                   {"text": "", style: 'tableHeader'},
                   {"text": tPago.toFixed(2), style: 'tableHeader', bold: true, alignment: 'right'},
                   {"text": tBeneficios.toFixed(2), style: 'tableHeader', bold: true, alignment: 'right'},
                   {"text": tAConcesion.toFixed(2), style: 'tableHeader', bold: true, alignment: 'right'},
                   {"text": tAPropietario.toFixed(2), style: 'tableHeader', bold: true, alignment: 'right'}
                ]);
        
        //console.log("BODY: "+ JSON.stringify(body) ) ;
        return body;
    }
    /*
    getDataValue(data, key) {
        //console.log("--------------- getDataValue------------------");
        //console.log(JSON.stringify(data));
        return {
            
        }

    } 
    */  
};

module.exports = pdfDocument;