import type {z} from '@openint/util'
import type {IconName} from '../components/Icon'

export type _infer<T, TDefault = unknown> = T extends z.ZodTypeAny
  ? z.infer<T>
  : TDefault

export type CommandDraft<
  TDef extends CommandDefinitionMap<TCtx>,
  TKey extends keyof TDef,
  TCtx = unknown,
> = [key: TKey, params: _infer<TDef[TKey]['params'], {}>]

export interface _CommandDefinitionInput<
  TCtx = unknown,
  TParams extends z.AnyZodObject = z.AnyZodObject,
  TRet = unknown,
> {
  icon?: IconName
  shortcut?: string
  title?: string
  subtitle?: string
  /** CommandGroup.heading */
  group?: string

  /** ParamsSchema */
  params?: TParams

  // TODO: add support for this. alternative to destructive: boolean prop also
  // requireConfirmation?: boolean | {} // AlertProps

  execute?: (options: {params: _infer<TParams, {}>; ctx: TCtx}) => TRet
}

export interface CommandDefinitionInput<
  TCtx = unknown,
  TParams extends z.AnyZodObject = z.AnyZodObject,
  TRet = unknown,
> extends _CommandDefinitionInput<TCtx, TParams> {
  /** How to allow dynamic command definition modification outside of react components? */
  useCommand?: (
    /** use _ for params even if unused for overriding */
    initialParams: Partial<_infer<TParams, {}>>,
    // Cannot redefine params because it is used for filtering the list of
    // commands to render in the first place...
  ) => Omit<_CommandDefinitionInput<TCtx, TParams, TRet>, 'params'>
}

export type CommandDefinitionMap<TCtx = unknown> = Record<
  string,
  CommandDefinitionInput<TCtx>
>

/**
 * Workaround limitation of satisfies not being able to have generic params
 * @see https://share.cleanshot.com/0bfZhflf
 */
export function cmdInit<TCtx = unknown>() {
  return {
    identity<TParams extends z.AnyZodObject = z.AnyZodObject, TRet = unknown>(
      input: CommandDefinitionInput<TCtx, TParams, TRet>,
    ) {
      return input
    },
    // Add an `extend` method would be nice, but hard to type so nvm

    makeCmds<TInput extends CommandDefinitionMap<TCtx>>(cmds: TInput) {
      return cmds
    },
  }
}
