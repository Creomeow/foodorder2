export interface PageParams {
  page: number;
  pageSize: number;
}

export function paginate({ page, pageSize }: PageParams) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function pageResult<T>(data: T[], total: number, { page, pageSize }: PageParams) {
  return {
    data,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
