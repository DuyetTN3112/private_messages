// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ICommand {
  // Marker interface for commands
}

export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
  execute(command: TCommand): Promise<TResult> | TResult;
}
