const escpos = require('escpos');
// Descomentar si usas impresora USB
// escpos.USB = require('escpos-usb');

/**
 * Imprime comanda en impresora térmica
 * @param {Object} order - Objeto de orden
 */
const printOrder = async (order) => {
  try {
    // Configuración de impresora (ajustar según tu hardware)
    // Para impresora USB:
    // const device = new escpos.USB();
    
    // Para impresora de red:
    // const device = new escpos.Network('192.168.1.100');
    
    // Simulación para desarrollo (comentar en producción)
    console.log('=== IMPRIMIENDO COMANDA ===');
    console.log(`Orden: ${order.orderNumber}`);
    console.log(`Fecha: ${new Date(order.createdAt).toLocaleString()}`);
    console.log(`Cajero: ${order.cashierName}`);
    console.log('----------------------------');
    
    order.items.forEach(item => {
      console.log(`${item.quantity}x ${item.productName} - $${item.subtotal.toFixed(2)}`);
    });
    
    console.log('----------------------------');
    console.log(`TOTAL: $${order.total.toFixed(2)}`);
    console.log(`Método de pago: ${order.paymentMethod.toUpperCase()}`);
    console.log('============================\n');

    /* Código real para impresora térmica (descomentar en producción):
    
    const printer = new escpos.Printer(device);
    
    device.open(async function(error) {
      if (error) {
        console.error('Error abriendo impresora:', error);
        return;
      }

      printer
        .font('a')
        .align('ct')
        .style('bu')
        .size(2, 2)
        .text(process.env.RESTAURANT_NAME || 'MI RESTAURANTE')
        .size(1, 1)
        .style('normal')
        .text('--------------------------------')
        .align('lt')
        .text(`Orden: ${order.orderNumber}`)
        .text(`Fecha: ${new Date(order.createdAt).toLocaleString()}`)
        .text(`Cajero: ${order.cashierName}`)
        .text('--------------------------------');

      order.items.forEach(item => {
        printer.text(`${item.quantity}x ${item.productName}`);
        printer.text(`    $${item.subtotal.toFixed(2)}`);
      });

      printer
        .text('--------------------------------')
        .style('bu')
        .size(1, 1)
        .text(`TOTAL: $${order.total.toFixed(2)}`)
        .style('normal')
        .text(`Pago: ${order.paymentMethod.toUpperCase()}`)
        .feed(2);

      // Imprimir QR si está disponible
      if (order.qrCode) {
        const qrBuffer = Buffer.from(order.qrCode.split(',')[1], 'base64');
        printer.align('ct').image(qrBuffer, 's8');
      }

      printer
        .feed(3)
        .cut()
        .close();
    });
    */

    return { success: true, message: 'Comanda impresa exitosamente' };
  } catch (error) {
    console.error('Error imprimiendo comanda:', error);
    throw new Error('Error al imprimir comanda');
  }
};

/**
 * Imprime reporte de cierre de caja
 * @param {Object} cashRegister - Objeto de caja registradora
 */
const printCashRegisterClose = async (cashRegister) => {
  try {
    console.log('=== CIERRE DE CAJA ===');
    console.log(`Fecha apertura: ${new Date(cashRegister.openingDate).toLocaleString()}`);
    console.log(`Fecha cierre: ${new Date(cashRegister.closingDate).toLocaleString()}`);
    console.log(`Cajero: ${cashRegister.openedByName}`);
    console.log('----------------------------');
    console.log(`Fondo inicial: $${cashRegister.initialAmount.toFixed(2)}`);
    console.log(`Ventas efectivo: $${cashRegister.cashSales.toFixed(2)}`);
    console.log(`Ventas tarjeta: $${cashRegister.cardSales.toFixed(2)}`);
    console.log(`Ventas transferencia: $${cashRegister.transferSales.toFixed(2)}`);
    console.log(`Total ventas: $${cashRegister.totalSales.toFixed(2)}`);
    console.log(`Total órdenes: ${cashRegister.totalOrders}`);
    console.log('----------------------------');
    console.log(`Efectivo esperado: $${cashRegister.expectedAmount.toFixed(2)}`);
    console.log(`Efectivo real: $${cashRegister.actualAmount.toFixed(2)}`);
    console.log(`Diferencia: $${cashRegister.difference.toFixed(2)}`);
    console.log('========================\n');

    return { success: true, message: 'Cierre de caja impreso exitosamente' };
  } catch (error) {
    console.error('Error imprimiendo cierre:', error);
    throw new Error('Error al imprimir cierre de caja');
  }
};

module.exports = {
  printOrder,
  printCashRegisterClose
};