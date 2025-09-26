const QRCode = require('qrcode');

/**
 * Genera código QR para una orden
 * @param {String} orderNumber - Número de orden
 * @returns {Promise<String>} - Data URL del código QR
 */
const generateOrderQR = async (orderNumber) => {
  try {
    const qrOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    const qrCodeDataUrl = await QRCode.toDataURL(orderNumber, qrOptions);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generando QR:', error);
    throw new Error('Error al generar código QR');
  }
};

/**
 * Genera código QR como buffer para impresión
 * @param {String} orderNumber - Número de orden
 * @returns {Promise<Buffer>} - Buffer del código QR
 */
const generateOrderQRBuffer = async (orderNumber) => {
  try {
    const qrBuffer = await QRCode.toBuffer(orderNumber, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200
    });

    return qrBuffer;
  } catch (error) {
    console.error('Error generando QR buffer:', error);
    throw new Error('Error al generar código QR para impresión');
  }
};

module.exports = {
  generateOrderQR,
  generateOrderQRBuffer
};