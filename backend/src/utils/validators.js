// Prefijos de operadoras móviles venezolanas válidos.
const CODIGOS_TELEFONICOS_VALIDOS = ['0412', '0414', '0416', '0422', '0424', '0426'];

function esNumeroTelefonoValido(numero) {
  return typeof numero === 'string' && /^\d{7}$/.test(numero);
}

function esNumeroDocumentoValido(numero) {
  return typeof numero === 'string' && /^\d{5,10}$/.test(numero);
}

module.exports = { CODIGOS_TELEFONICOS_VALIDOS, esNumeroTelefonoValido, esNumeroDocumentoValido };
