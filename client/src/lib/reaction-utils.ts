export interface MessageReaction {
  emoji: string;
  sender_id: string;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
}

export const toggle_reaction_for_user = (
  reactions: readonly MessageReaction[],
  emoji: string,
  sender_id: string
): MessageReaction[] => {
  if (emoji.trim() === '' || sender_id.trim() === '') {
    return [...reactions];
  }

  const exists = reactions.some(
    (reaction) => reaction.emoji === emoji && reaction.sender_id === sender_id
  );

  if (exists) {
    // Remove all duplicated entries of the same user+emoji pair for idempotent behavior.
    return reactions.filter(
      (reaction) => !(reaction.emoji === emoji && reaction.sender_id === sender_id)
    );
  }

  return [...reactions, { emoji, sender_id }];
};

export const summarize_reactions_by_emoji = (
  reactions: readonly MessageReaction[]
): ReactionSummary[] => {
  const counts = new Map<string, number>();

  for (const reaction of reactions) {
    counts.set(reaction.emoji, (counts.get(reaction.emoji) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([emoji, count]) => ({ emoji, count }));
};
