function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Ruta no encontrada.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  // Violación de restricción única de Postgres
  if (err.code === '23505') {
    return res.status(409).json({ message: 'Ya existe un registro con ese valor único (código, email, etc.).' });
  }
  // Violación de llave foránea
  if (err.code === '23503') {
    return res.status(409).json({ message: 'Operación inválida: el registro relacionado no existe o está en uso.' });
  }
  // Violación de check constraint
  if (err.code === '23514') {
    return res.status(400).json({ message: 'Uno de los valores enviados no es válido.' });
  }

  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Error interno del servidor.' });
}

module.exports = { notFoundHandler, errorHandler };
