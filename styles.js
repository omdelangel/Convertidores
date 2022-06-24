const { drawBackground } = require("pdfmake/src/textDecorator");

module.exports ={
    header: {
        bold: true,
        fontSize: 13, 
        alignment: "center",
        color: "#000000",
    },
    subheader: {
        bold: true,
        fontSize: 10, 
        alignment: "justify",
        color: "#000000",
    },
    label: { 
        fontsize: 10,
        color: "#020232",
    },
    tableTitle: {
        bold: true,
        fontSize: 10, 
        alignment: "center",
        color: "#000000",
    },
    tableExample: {
        margin: [0, 5, 0, 15]
    },
    tableHeader: {
        bold: true,
        fontSize: 8,
        color: '#7CBE02',
        fillColor: '#011D7E',
        alignment: "center"
    },
    tableDetail: {
        bold: false,
        fontSize: 8,
        color: 'black'
    },
    emailContrato: {
        fontSize: 12,
        color: 'blue',
        decoration: 'underline'
    }
};