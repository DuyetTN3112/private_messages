// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IQuery {
  // Marker interface for queries
}

export interface IQueryHandler<TQuery extends IQuery, TResult> {
  execute(query: TQuery): Promise<TResult> | TResult;
}
