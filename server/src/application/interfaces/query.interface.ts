export type IQuery = object;

export interface IQueryHandler<TQuery extends IQuery, TResult> {
  execute(query: TQuery): Promise<TResult> | TResult;
}
