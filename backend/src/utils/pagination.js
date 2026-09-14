/**
 * Normaliza los parámetros de paginación de una query string.
 * @param {object} query - req.query
 * @param {number} defaultPageSize
 * @param {number} maxPageSize
 */
function getPagination(query, defaultPageSize = 20, maxPageSize = 100) {
  let page = parseInt(query.page, 10);
  let pageSize = parseInt(query.page_size, 10);

  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(pageSize) || pageSize < 1) pageSize = defaultPageSize;
  if (pageSize > maxPageSize) pageSize = maxPageSize;

  return { page, pageSize, offset: (page - 1) * pageSize };
}

function buildPaginatedResponse(rows, total, page, pageSize) {
  return {
    data: rows,
    pagination: {
      page,
      page_size: pageSize,
      total: Number(total),
      total_pages: Math.max(1, Math.ceil(Number(total) / pageSize)),
    },
  };
}

module.exports = { getPagination, buildPaginatedResponse };
