import { ICommand, ICommandHandler } from '../application/interfaces/command.interface';
import { ICommandBus } from '../application/interfaces/bus.interface';

export class InMemoryCommandBus implements ICommandBus {
  private handlers = new Map<string, unknown>();

  register<TCommand extends ICommand>(
    command_name: string,
    handler: ICommandHandler<TCommand, unknown>
  ): void {
    if (this.handlers.has(command_name)) {
      throw new Error(`Command handler for ${command_name} is already registered`);
    }
    this.handlers.set(command_name, handler);
  }

  async execute<TResult = void>(
    command: ICommand
  ): Promise<TResult> {
    const command_name = command.constructor.name;
    const handler = this.handlers.get(command_name);

    if (handler === undefined) {
      throw new Error(`No handler registered for command: ${command_name}`);
    }

    return (handler as unknown as { execute: (cmd: unknown) => Promise<unknown> }).execute(command) as Promise<TResult>;
  }
}
